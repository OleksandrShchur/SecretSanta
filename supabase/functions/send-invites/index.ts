import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildInviteEmailHtml(roomTitle: string, hostName: string, inviteUrl: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Запрошення до Таємного Санти</title>
  </head>
  <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f9f7; margin: 0; padding: 24px; color: #333;">
    <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e0e0e0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
      
      <div style="background: linear-gradient(135deg, #006400 0%, #008000 100%); padding: 30px 20px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 800;">🎄 Запрошення до Таємного Санти</h1>
        <p style="margin: 8px 0 0; font-size: 16px; opacity: 0.95;">Кімната: «${roomTitle}»</p>
      </div>

      <div style="padding: 30px 24px; text-align: center;">
        <p style="font-size: 16px; line-height: 1.6; color: #444; margin-top: 0;">
          <strong>${hostName}</strong> запрошує вас взяти участь у новорічному розіграші <strong>«${roomTitle}»</strong>! 🎅🎁
        </p>

        <p style="font-size: 14px; color: #666; line-height: 1.5; margin: 15px 0 25px;">
          Перейдіть за посиланням нижче, щоб заповнити своє ім'я, прізвище та (за бажанням) список побажань для вашого Таємного Санти:
        </p>

        <a href="${inviteUrl}" style="display: inline-block; background-color: #c00; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 10px rgba(204,0,0,0.25);">
          Приєднатися до кімнати ➔
        </a>

        <div style="margin-top: 30px; padding: 14px; background: #fdfdfd; border: 1px solid #eee; border-radius: 6px; word-break: break-all; font-size: 12px; color: #777;">
          Або скопіюйте посилання вручну: <br>
          <a href="${inviteUrl}" style="color: #006400;">${inviteUrl}</a>
        </div>
      </div>

      <div style="background-color: #fafafa; border-top: 1px solid #eee; padding: 16px; text-align: center; font-size: 12px; color: #999;">
        Організатор Таємного Санти 🎅✨
      </div>
    </div>
  </body>
  </html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { roomId, adminToken, emails, inviteUrl } = await req.json();

    if (!roomId || !adminToken || !Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: "Необхідно вказати roomId, adminToken та список emails." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mailjetApiKey = Deno.env.get("MAILJET_API_KEY");
    const mailjetApiSecret = Deno.env.get("MAILJET_API_SECRET");
    const mailjetSenderEmail = Deno.env.get("MAILJET_SENDER_EMAIL") || Deno.env.get("MAILJET_FROM_EMAIL");
    const mailjetSenderName = Deno.env.get("MAILJET_SENDER_NAME") || "Таємний Санта";

    if (!mailjetApiKey || !mailjetApiSecret || !mailjetSenderEmail) {
      return new Response(
        JSON.stringify({ error: "Ключі MAILJET_API_KEY, MAILJET_API_SECRET або MAILJET_SENDER_EMAIL не налаштовано на сервері." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Перевіряємо кімнату в room_secrets
    const { data: secret, error: secretError } = await supabase
      .from("room_secrets")
      .select("admin_token")
      .eq("room_id", roomId)
      .eq("admin_token", adminToken)
      .single();

    if (secretError || !secret) {
      return new Response(
        JSON.stringify({ error: "Недійсний токен хоста або кімнату не знайдено." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Отримуємо публічні дані кімнати
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("title, host_name")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ error: "Кімнату не знайдено." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    const errors: string[] = [];

    for (const email of emails) {
      const cleanEmail = String(email).trim();
      if (!cleanEmail) continue;

      try {
        const auth = btoa(`${mailjetApiKey}:${mailjetApiSecret}`);
        const res = await fetch("https://api.mailjet.com/v3.1/send", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Messages: [
              {
                From: {
                  Email: mailjetSenderEmail,
                  Name: mailjetSenderName,
                },
                To: [
                  {
                    Email: cleanEmail,
                  },
                ],
                Subject: `🎄 Запрошення: Таємний Санта «${room.title}»`,
                HTMLPart: buildInviteEmailHtml(room.title, room.host_name, inviteUrl),
              },
            ],
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          const firstMsg = resData?.Messages?.[0];
          if (firstMsg?.Status === "error") {
            const errDetail = firstMsg?.Errors?.map((e: any) => e.ErrorMessage).join("; ") || "Mailjet error";
            errors.push(`${cleanEmail}: ${errDetail}`);
          } else {
            sent++;
          }
        } else {
          const errData = await res.json();
          errors.push(`${cleanEmail}: ${errData.ErrorMessage || res.statusText}`);
        }
      } catch (e) {
        errors.push(`${cleanEmail}: ${String(e)}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sentCount: sent, errors: errors.length > 0 ? errors : undefined }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
