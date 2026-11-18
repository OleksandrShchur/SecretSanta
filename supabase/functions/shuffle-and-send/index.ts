import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Participant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  wishlist?: string;
}

interface Restriction {
  giver_id: string;
  receiver_id: string;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildGraph(
  participants: Participant[],
  restrictions: Restriction[]
): boolean[][] {
  const n = participants.length;
  const restrictedSet = new Set(
    restrictions.map((r) => `${r.giver_id}->${r.receiver_id}`)
  );

  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return false;
      const giverId = participants[i].id;
      const receiverId = participants[j].id;
      return !restrictedSet.has(`${giverId}->${receiverId}`);
    })
  );
}

function findRandomHamiltonianCycle(graph: boolean[][], n: number): number[] | null {
  function dfs(path: number[], visited: boolean[]): number[] | null {
    if (path.length === n) {
      return graph[path[n - 1]][path[0]] ? [...path] : null;
    }

    const last = path[path.length - 1];
    const candidates = graph[last]
      .map((canGo, i) => (canGo && !visited[i] ? i : null))
      .filter((i): i is number => i !== null);

    const shuffled = shuffle(candidates);

    for (const v of shuffled) {
      visited[v] = true;
      path.push(v);

      const res = dfs(path, visited);
      if (res) return res;

      path.pop();
      visited[v] = false;
    }
    return null;
  }

  const path = [0];
  const visited = Array(n).fill(false);
  visited[0] = true;
  return dfs(path, visited);
}

function buildEmailHtml(roomTitle: string, giverName: string, receiver: Participant): string {
  const wishlistHtml = receiver.wishlist && receiver.wishlist.trim()
    ? `<div style="background-color: #fff9e6; border-left: 4px solid #b8860b; padding: 12px 16px; margin-top: 15px; border-radius: 4px; text-align: left;">
         <strong style="color: #b8860b; font-size: 14px;">🎁 Побажання до подарунка:</strong>
         <p style="margin: 8px 0 0; color: #333; font-style: italic; white-space: pre-line;">${receiver.wishlist.trim()}</p>
       </div>`
    : `<p style="color: #666; font-size: 14px; margin-top: 12px; font-style: italic;">(Підопічний не залишив особливих побажань — обери подарунок від щирого серця! 🎄)</p>`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Таємний Санта</title>
  </head>
  <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f9f7; margin: 0; padding: 24px; color: #333;">
    <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e0e0e0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
      
      <div style="background: linear-gradient(135deg, #8a0000 0%, #b30000 100%); padding: 30px 20px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">🎅 Твій Таємний Санта</h1>
        <p style="margin: 8px 0 0; font-size: 16px; opacity: 0.95;">Кімната: «${roomTitle}»</p>
      </div>

      <div style="padding: 30px 24px; text-align: center;">
        <h2 style="color: #006400; margin-top: 0; font-size: 20px;">Привіт, ${giverName}! 🎄</h2>
        <p style="font-size: 15px; line-height: 1.5; color: #555;">
          Жеребкування успішно відбулося. Твій щасливий підопічний:
        </p>

        <div style="background: #f0fdf4; border: 2px dashed #006400; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #006400; font-weight: bold;">Тобі випало дарувати подарунок:</div>
          <div style="font-size: 24px; font-weight: 800; color: #8a0000; margin: 10px 0;">
            ${receiver.first_name} ${receiver.last_name}
          </div>
          <div style="font-size: 14px; color: #555;">
            ✉️ Email: <a href="mailto:${receiver.email}" style="color: #006400; text-decoration: underline;">${receiver.email}</a>
          </div>

          ${wishlistHtml}
        </div>

        <p style="font-size: 14px; color: #777; line-height: 1.5; margin-top: 20px;">
          🤫 <strong>Пам'ятай:</strong> це секрет! Не розкривай себе до моменту вручення подарунка.
        </p>
      </div>

      <div style="background-color: #fafafa; border-top: 1px solid #eee; padding: 16px; text-align: center; font-size: 12px; color: #999;">
        З любов'ю, Організатор Таємного Санти 🎅✨
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
    const { roomId, adminToken } = await req.json();

    if (!roomId || !adminToken) {
      return new Response(
        JSON.stringify({ error: "Missing roomId or adminToken" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const webAppUrl = Deno.env.get("WEBAPP_URL");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Безпечна перевірка admin_token у таблиці room_secrets
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

    // 2. Отримуємо дані кімнати
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ error: "Кімнату не знайдено." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (room.status === "shuffled") {
      return new Response(
        JSON.stringify({ error: "Жеребкування для цієї кімнати вже було проведено!" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Отримуємо учасників
    const { data: participants, error: pError } = await supabase
      .from("participants")
      .select("*")
      .eq("room_id", roomId);

    if (pError || !participants || participants.length < 3) {
      return new Response(
        JSON.stringify({ error: "Для жеребкування потрібно щонайменше 3 учасники." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Отримуємо обмеження
    const { data: restrictions } = await supabase
      .from("restrictions")
      .select("giver_id, receiver_id")
      .eq("room_id", roomId);

    // 5. Будуємо граф та знаходимо гамільтонів цикл
    const graph = buildGraph(participants, restrictions || []);
    const cycle = findRandomHamiltonianCycle(graph, participants.length);

    if (!cycle) {
      return new Response(
        JSON.stringify({
          error: "Неможливо згенерувати жеребкування через задані обмеження! Спробуйте послабити обмеження для деяких учасників.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Формуємо пари (giver -> receiver)
    const pairs: { giver: Participant; receiver: Participant }[] = [];
    for (let i = 0; i < cycle.length; i++) {
      const giver = participants[cycle[i]];
      const receiver = participants[cycle[(i + 1) % cycle.length]];
      pairs.push({ giver, receiver });
    }

    // 7. Зберігаємо призначення в БД
    const assignmentRows = pairs.map((pair) => ({
      room_id: roomId,
      giver_id: pair.giver.id,
      receiver_id: pair.receiver.id,
      notification_sent: false,
    }));

    await supabase.from("assignments").delete().eq("room_id", roomId);
    const { error: assignError } = await supabase.from("assignments").insert(assignmentRows);
    if (assignError) {
      console.error("Assign insert error:", assignError);
    }

    // 8. Відправляємо сповіщення через Telegram Bot API
    let notificationsSent = 0;
    const errors: string[] = [];

    if (telegramBotToken) {
      for (const pair of pairs) {
        try {
          const receiverName = `${pair.receiver.first_name} ${pair.receiver.last_name || ""}`.trim();
          const receiverUsername = pair.receiver.telegram_username ? `(@${pair.receiver.telegram_username.replace(/^@/, "")})` : "";
          const wishlist = pair.receiver.wishlist ? `\n🎁 <b>Побажання:</b>\n<i>${pair.receiver.wishlist}</i>\n` : "";

          const text = `🎅 <b>Твій Таємний Санта: «${room.title}»</b>\n\nПривіт, ${pair.giver.first_name}! 🎄\nЖеребкування успішно відбулося.\n\n🎁 <b>Тобі випало дарувати подарунок для:</b>\n<b>${receiverName}</b> ${receiverUsername}\n${wishlist}\n🤫 <i>Пам'ятай: це секрет! Не видавай себе завчасно.</i>`;

          const payload: any = {
            chat_id: pair.giver.telegram_id,
            text,
            parse_mode: "HTML",
          };

          if (webAppUrl && webAppUrl.startsWith("https://")) {
            const baseUrl = webAppUrl.replace(/\/+$/, "");
            const sep = baseUrl.includes("?") ? "&" : "?";
            const targetUrl = `${baseUrl}${sep}room=${roomId}`;
            payload.reply_markup = {
              inline_keyboard: [
                [
                  {
                    text: "🎁 Відкрити кімнату в додатку",
                    web_app: { url: targetUrl },
                  },
                ],
              ],
            };
          }

          const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            notificationsSent++;
            await supabase
              .from("assignments")
              .update({ notification_sent: true })
              .eq("room_id", roomId)
              .eq("giver_id", pair.giver.id);
          } else {
            const errData = await res.json();
            errors.push(`${pair.giver.telegram_id}: ${errData.description || res.statusText}`);
          }
        } catch (e) {
          errors.push(`${pair.giver.telegram_id}: ${String(e)}`);
        }
      }
    } else {
      console.warn("TELEGRAM_BOT_TOKEN is not set. Notifications were not dispatched.");
    }

    // 9. Оновлюємо статус кімнати на 'shuffled'
    await supabase.from("rooms").update({ status: "shuffled" }).eq("id", roomId);

    return new Response(
      JSON.stringify({
        success: true,
        totalParticipants: participants.length,
        notificationsSent,
        hasTelegramToken: Boolean(telegramBotToken),
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
