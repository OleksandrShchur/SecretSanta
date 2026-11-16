window.SecretSanta = window.SecretSanta || {};

(function (ns) {
    let client = null;

    function getClient() {
        const cfg = ns.config.get();
        if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
            if (!client || client.supabaseUrl !== cfg.supabaseUrl) {
                client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
            }
            return client;
        }
        return null;
    }

    // ==========================================
    // Local / Demo Mock Store (коли ключі ще не введені)
    // ==========================================
    const MOCK_STORAGE_KEY = 'secret_santa_mock_rooms';
    function getMockDb() {
        try {
            return JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY) || '{}');
        } catch {
            return {};
        }
    }
    function saveMockDb(db) {
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
    }

    // ==========================================
    // Public API
    // ==========================================
    const backend = {
        isLive: function () {
            return Boolean(getClient());
        },

        createRoom: async function ({ title, hostName, hostEmail }) {
            const cl = getClient();
            if (cl) {
                const { data, error } = await cl.rpc('create_room_secure', {
                    p_title: title,
                    p_host_name: hostName,
                    p_host_email: hostEmail
                });

                if (error) throw error;
                return { room: data.room, adminToken: data.admin_token };
            }

            // Demo mock fallback:
            const id = 'mock-' + Math.random().toString(36).substring(2, 10);
            const adminToken = 'adm-' + Math.random().toString(36).substring(2, 12);
            const room = {
                id,
                title,
                host_name: hostName,
                status: 'collecting',
                created_at: new Date().toISOString()
            };

            const db = getMockDb();
            db[id] = { room, adminToken, hostEmail, participants: [], restrictions: [] };
            saveMockDb(db);
            return { room, adminToken };
        },

        getRoom: async function (roomId) {
            const cl = getClient();
            if (cl) {
                const { data, error } = await cl
                    .from('rooms')
                    .select('id, title, host_name, status, created_at')
                    .eq('id', roomId)
                    .single();
                if (error) throw error;
                return data;
            }

            const db = getMockDb();
            const record = db[roomId];
            if (!record) throw new Error('Кімнату не знайдено');
            return record.room;
        },

        getRoomWithAdmin: async function (roomId, adminToken) {
            const cl = getClient();
            if (cl) {
                const { data, error } = await cl.rpc('get_room_with_admin', {
                    p_room_id: roomId,
                    p_admin_token: adminToken
                });
                if (error || !data) throw new Error(error?.message || 'Недійсний токен хоста');
                const room = data;
                room.admin_token = adminToken;
                return room;
            }

            const db = getMockDb();
            const record = db[roomId];
            if (!record || record.adminToken !== adminToken) {
                throw new Error('Недійсний токен хоста або кімнату не знайдено');
            }
            const room = { ...record.room, admin_token: adminToken };
            return room;
        },

        getParticipants: async function (roomId) {
            const cl = getClient();
            if (cl) {
                const { data, error } = await cl
                    .from('participants')
                    .select('*')
                    .eq('room_id', roomId)
                    .order('created_at', { ascending: true });
                if (error) throw error;
                return data || [];
            }

            const db = getMockDb();
            return (db[roomId]?.participants || []);
        },

        addParticipant: async function ({ roomId, firstName, lastName, email, wishlist }) {
            const cl = getClient();
            if (cl) {
                const { data, error } = await cl
                    .from('participants')
                    .insert([{
                        room_id: roomId,
                        first_name: firstName.trim(),
                        last_name: lastName.trim(),
                        email: email.trim().toLowerCase(),
                        wishlist: (wishlist || '').trim()
                    }])
                    .select()
                    .single();
                if (error) {
                    if (error.code === '23505') {
                        throw new Error('Учасник з таким email вже зареєстрований у цій кімнаті!');
                    }
                    throw error;
                }
                return data;
            }

            // Mock fallback
            const db = getMockDb();
            if (!db[roomId]) throw new Error('Кімнату не знайдено');
            const cleanEmail = email.trim().toLowerCase();
            const existing = db[roomId].participants.find(p => p.email.toLowerCase() === cleanEmail);
            if (existing) {
                throw new Error('Учасник з таким email вже зареєстрований у цій кімнаті!');
            }

            const participant = {
                id: 'part-' + Math.random().toString(36).substring(2, 9),
                room_id: roomId,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: cleanEmail,
                wishlist: (wishlist || '').trim(),
                created_at: new Date().toISOString()
            };
            db[roomId].participants.push(participant);
            saveMockDb(db);
            return participant;
        },

        removeParticipant: async function (roomId, participantId, adminToken) {
            const cl = getClient();
            if (cl) {
                const { error } = await cl.rpc('delete_participant_as_host', {
                    p_room_id: roomId,
                    p_participant_id: participantId,
                    p_admin_token: adminToken
                });
                if (error) throw error;
                return true;
            }

            const db = getMockDb();
            if (db[roomId]) {
                db[roomId].participants = db[roomId].participants.filter(p => p.id !== participantId);
                db[roomId].restrictions = (db[roomId].restrictions || []).filter(
                    r => r.giver_id !== participantId && r.receiver_id !== participantId
                );
                saveMockDb(db);
            }
            return true;
        },

        getRestrictions: async function (roomId) {
            const cl = getClient();
            if (cl) {
                const { data, error } = await cl
                    .from('restrictions')
                    .select('giver_id, receiver_id')
                    .eq('room_id', roomId);
                if (error) throw error;
                return data || [];
            }

            const db = getMockDb();
            return (db[roomId]?.restrictions || []);
        },

        saveRestrictions: async function (roomId, adminToken, restrictionsList) {
            const cl = getClient();
            if (cl) {
                const { error } = await cl.rpc('save_restrictions_as_host', {
                    p_room_id: roomId,
                    p_admin_token: adminToken,
                    p_restrictions: restrictionsList
                });
                if (error) throw error;
                return true;
            }

            const db = getMockDb();
            if (db[roomId]) {
                db[roomId].restrictions = restrictionsList;
                saveMockDb(db);
            }
            return true;
        },

        subscribeToRoom: function (roomId, onUpdate) {
            const cl = getClient();
            if (cl) {
                const channel = cl.channel(`room-channel-${roomId}`)
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${roomId}` },
                        () => onUpdate()
                    )
                    .on(
                        'postgres_changes',
                        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
                        () => onUpdate()
                    )
                    .subscribe();

                return () => {
                    cl.removeChannel(channel);
                };
            }

            // Mock polling listener
            const interval = setInterval(onUpdate, 3000);
            return () => clearInterval(interval);
        },

        sendInvites: async function ({ roomId, adminToken, emails, inviteUrl }) {
            const cl = getClient();
            if (cl) {
                const { data, error } = await cl.functions.invoke('send-invites', {
                    body: { roomId, adminToken, emails, inviteUrl }
                });
                if (error) throw error;
                return data;
            }

            // Mock response:
            return { success: true, sentCount: emails.length, mock: true };
        },

        performShuffle: async function ({ roomId, adminToken }) {
            const cl = getClient();
            if (cl) {
                const { data, error } = await cl.functions.invoke('shuffle-and-send', {
                    body: { roomId, adminToken }
                });
                if (error) throw error;
                if (data.error) throw new Error(data.error);
                return data;
            }

            // Mock shuffle logic locally if Supabase edge function not connected
            const db = getMockDb();
            const roomData = db[roomId];
            if (!roomData) throw new Error('Кімнату не знайдено');
            const participants = roomData.participants;
            if (participants.length < 3) {
                throw new Error('Для жеребкування потрібно щонайменше 3 учасники!');
            }

            roomData.room.status = 'shuffled';
            saveMockDb(db);

            return {
                success: true,
                totalParticipants: participants.length,
                emailsSent: participants.length,
                mock: true
            };
        }
    };

    ns.backend = backend;
})(window.SecretSanta);
