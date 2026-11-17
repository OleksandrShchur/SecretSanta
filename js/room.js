window.SecretSanta = window.SecretSanta || {};

(function (ns) {
    const { backend } = ns;

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getQueryParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            roomId: params.get('room'),
            adminToken: params.get('admin'),
            mode: params.get('tab')
        };
    }

    function setQueryParams(params) {
        const url = new URL(window.location);
        Object.entries(params).forEach(([key, val]) => {
            if (val === null || val === undefined) {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, val);
            }
        });
        window.history.replaceState({}, '', url);
    }

    function initRoomModule() {
        // Elements
        const tabOfflineBtn = document.getElementById('tab-offline-btn');
        const tabOnlineBtn = document.getElementById('tab-online-btn');
        const offlineApp = document.getElementById('offline-app');
        const onlineApp = document.getElementById('online-app');

        // Subviews inside onlineApp
        const viewCreateRoom = document.getElementById('view-create-room');
        const viewJoinRoom = document.getElementById('view-join-room');
        const viewHostDashboard = document.getElementById('view-host-dashboard');

        // Forms and actions
        const createRoomForm = document.getElementById('create-room-form');
        const joinRoomForm = document.getElementById('join-room-form');
        const joinSuccessCard = document.getElementById('join-success-card');
        const joinFormCard = document.getElementById('join-form-card');

        // Host elements
        const hostRoomTitle = document.getElementById('host-room-title');
        const hostStatusBadge = document.getElementById('host-status-badge');
        const hostParticipantCount = document.getElementById('host-participant-count');
        const hostParticipantsList = document.getElementById('host-participants-list');
        const hostShareLinkInput = document.getElementById('host-share-link-input');
        const hostCopyLinkBtn = document.getElementById('host-copy-link-btn');
        const hostEmailInvitesForm = document.getElementById('host-email-invites-form');
        const hostEmailInvitesInput = document.getElementById('host-email-invites-input');
        const hostShuffleBtn = document.getElementById('host-shuffle-btn');
        const hostShuffleNotice = document.getElementById('host-shuffle-notice');
        const hostShuffleSuccess = document.getElementById('host-shuffle-success');
        const hostRestrictionsToggle = document.getElementById('host-restrictions-toggle');
        const hostRestrictionsContainer = document.getElementById('host-restrictions-container');
        const hostRestrictionsDiv = document.getElementById('host-restrictions-div');

        // Settings modal
        const configBtn = document.getElementById('cloud-config-btn');
        const configModal = document.getElementById('config-modal');
        const configCloseBtn = document.getElementById('config-modal-close');
        const configForm = document.getElementById('config-form');
        const configUrlInput = document.getElementById('config-supabase-url');
        const configKeyInput = document.getElementById('config-supabase-key');
        const cloudStatusIndicator = document.getElementById('cloud-status-indicator');

        let currentRoom = null;
        let currentParticipants = [];
        let currentRestrictions = [];
        let unsubscribeRealtime = null;

        // ==========================================
        // Tab switching
        // ==========================================
        function switchTab(tab) {
            const isOnline = tab === 'online';
            tabOfflineBtn.classList.toggle('active', !isOnline);
            tabOnlineBtn.classList.toggle('active', isOnline);
            offlineApp.classList.toggle('is-hidden', isOnline);
            onlineApp.classList.toggle('is-hidden', !isOnline);

            if (isOnline) {
                routeOnlineView();
            } else {
                setQueryParams({ tab: null, room: null, admin: null });
                if (unsubscribeRealtime) {
                    unsubscribeRealtime();
                    unsubscribeRealtime = null;
                }
            }
        }

        tabOfflineBtn.addEventListener('click', () => switchTab('offline'));
        tabOnlineBtn.addEventListener('click', () => switchTab('online'));

        // ==========================================
        // View Routing
        // ==========================================
        async function routeOnlineView() {
            const { roomId, adminToken } = getQueryParams();

            viewCreateRoom.classList.add('is-hidden');
            viewJoinRoom.classList.add('is-hidden');
            viewHostDashboard.classList.add('is-hidden');

            if (roomId && adminToken) {
                await loadHostDashboard(roomId, adminToken);
            } else if (roomId) {
                await loadJoinView(roomId);
            } else {
                viewCreateRoom.classList.remove('is-hidden');
            }
            updateCloudStatusUI();
        }

        // ==========================================
        // Create Room
        // ==========================================
        const hostParticipatesCb = document.getElementById('create-host-participates');
        const hostWishlistGroup = document.getElementById('create-host-wishlist-group');
        if (hostParticipatesCb && hostWishlistGroup) {
            hostParticipatesCb.addEventListener('change', () => {
                hostWishlistGroup.classList.toggle('is-hidden', !hostParticipatesCb.checked);
            });
        }

        createRoomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = createRoomForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Створюємо кімнату...';

            const title = document.getElementById('create-room-title').value.trim();
            const firstName = document.getElementById('create-host-first-name').value.trim();
            const lastName = document.getElementById('create-host-last-name').value.trim();
            const hostName = `${firstName} ${lastName}`.trim();
            const hostEmail = document.getElementById('create-host-email').value.trim();
            const hostParticipates = hostParticipatesCb ? hostParticipatesCb.checked : false;
            const hostWishlist = document.getElementById('create-host-wishlist')?.value.trim() || '';

            try {
                const { room, adminToken } = await backend.createRoom({
                    title,
                    hostName,
                    hostEmail
                });

                if (hostParticipates) {
                    await backend.addParticipant({
                        roomId: room.id,
                        firstName,
                        lastName,
                        email: hostEmail,
                        wishlist: hostWishlist
                    });
                }

                setQueryParams({ tab: 'online', room: room.id, admin: adminToken });
                await loadHostDashboard(room.id, adminToken);
            } catch (err) {
                alert('Помилка створення кімнати: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Створити кімнату ➔';
            }
        });

        // ==========================================
        // Host Dashboard
        // ==========================================
        async function loadHostDashboard(roomId, adminToken) {
            try {
                currentRoom = await backend.getRoomWithAdmin(roomId, adminToken);
            } catch (err) {
                alert('Не вдалося завантажити кімнату хоста: ' + err.message);
                setQueryParams({ tab: 'online', room: null, admin: null });
                viewCreateRoom.classList.remove('is-hidden');
                return;
            }

            viewHostDashboard.classList.remove('is-hidden');
            hostRoomTitle.textContent = currentRoom.title;

            const inviteUrl = `${window.location.origin}${window.location.pathname}?tab=online&room=${currentRoom.id}`;
            hostShareLinkInput.value = inviteUrl;

            await refreshHostData(roomId);

            if (unsubscribeRealtime) unsubscribeRealtime();
            unsubscribeRealtime = backend.subscribeToRoom(roomId, () => {
                refreshHostData(roomId);
            });
        }

        async function refreshHostData(roomId) {
            currentParticipants = await backend.getParticipants(roomId);
            currentRestrictions = await backend.getRestrictions(roomId);

            const isShuffled = currentRoom.status === 'shuffled';
            hostStatusBadge.textContent = isShuffled ? 'Жеребкування проведено 🎉' : 'Збір учасників 🎅';
            hostStatusBadge.className = 'status-badge ' + (isShuffled ? 'badge-shuffled' : 'badge-collecting');

            hostParticipantCount.textContent = `Зареєстровано учасників: ${currentParticipants.length}`;

            renderHostParticipants(isShuffled);
            renderRestrictionsMatrix(isShuffled);

            // Shuffle Button State
            if (isShuffled) {
                hostShuffleBtn.classList.add('is-hidden');
                hostShuffleNotice.classList.add('is-hidden');
                hostShuffleSuccess.classList.remove('is-hidden');
            } else {
                hostShuffleSuccess.classList.add('is-hidden');
                hostShuffleBtn.classList.remove('is-hidden');
                const canShuffle = currentParticipants.length >= 3;
                hostShuffleBtn.disabled = !canShuffle;
                hostShuffleNotice.textContent = canShuffle
                    ? 'Усі готові! Натисніть кнопку, щоб запустити жеребкування та розіслати листи.'
                    : `Для жеребкування потрібно мінімум 3 учасники (зараз: ${currentParticipants.length}).`;
            }
        }

        function renderHostParticipants(isShuffled) {
            hostParticipantsList.replaceChildren();

            if (currentParticipants.length === 0) {
                const emptyItem = document.createElement('li');
                emptyItem.className = 'participant-item empty-state';
                emptyItem.textContent = 'Поки що немає зареєстрованих учасників. Надішліть посилання друзям!';
                hostParticipantsList.appendChild(emptyItem);
                return;
            }

            currentParticipants.forEach((p, idx) => {
                const li = document.createElement('li');
                li.className = 'participant-item';

                const infoDiv = document.createElement('div');
                infoDiv.className = 'participant-info';

                const nameEl = document.createElement('div');
                nameEl.className = 'participant-name-title';
                nameEl.textContent = `${idx + 1}. ${p.first_name} ${p.last_name}`;

                const emailEl = document.createElement('div');
                emailEl.className = 'participant-email-text';
                emailEl.textContent = p.telegram_username ? `@${p.telegram_username}` : (p.telegram_id ? `ID: ${p.telegram_id}` : (p.email || ''));

                infoDiv.append(nameEl, emailEl);

                if (p.wishlist && p.wishlist.trim()) {
                    const wishEl = document.createElement('div');
                    wishEl.className = 'participant-wish-badge';
                    wishEl.innerHTML = `🎁 <em>${escapeHtml(p.wishlist.trim())}</em>`;
                    infoDiv.appendChild(wishEl);
                }

                li.appendChild(infoDiv);

                if (!isShuffled) {
                    const delBtn = document.createElement('button');
                    delBtn.type = 'button';
                    delBtn.className = 'btn-danger-sm';
                    delBtn.textContent = '✕';
                    delBtn.title = 'Видалити учасника';
                    delBtn.addEventListener('click', async () => {
                        if (confirm(`Видалити учасника ${p.first_name} ${p.last_name}?`)) {
                            await backend.removeParticipant(currentRoom.id, p.id, currentRoom.admin_token);
                            await refreshHostData(currentRoom.id);
                        }
                    });
                    li.appendChild(delBtn);
                }

                hostParticipantsList.appendChild(li);
            });
        }

        function renderRestrictionsMatrix(isShuffled) {
            if (currentParticipants.length < 2) {
                hostRestrictionsContainer.classList.add('is-hidden');
                return;
            }

            hostRestrictionsContainer.classList.remove('is-hidden');
            hostRestrictionsDiv.replaceChildren();

            const restrictedSet = new Set(
                currentRestrictions.map(r => `${r.giver_id}->${r.receiver_id}`)
            );

            currentParticipants.forEach((giver) => {
                const block = document.createElement('div');
                block.className = 'restriction-block';

                const title = document.createElement('p');
                title.className = 'restriction-title';
                title.textContent = `${giver.first_name} ${giver.last_name} не може дарувати:`;

                const optionsDiv = document.createElement('div');
                optionsDiv.className = 'restriction-options';

                currentParticipants.forEach((receiver) => {
                    if (giver.id === receiver.id) return;

                    const label = document.createElement('label');
                    label.className = 'restriction-option';

                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.disabled = isShuffled;
                    const key = `${giver.id}->${receiver.id}`;
                    cb.checked = restrictedSet.has(key);

                    cb.addEventListener('change', async () => {
                        if (cb.checked) {
                            restrictedSet.add(key);
                        } else {
                            restrictedSet.delete(key);
                        }
                        const newRestrictions = [];
                        restrictedSet.forEach(k => {
                            const [gId, rId] = k.split('->');
                            newRestrictions.push({ giver_id: gId, receiver_id: rId });
                        });
                        currentRestrictions = newRestrictions;
                        await backend.saveRestrictions(currentRoom.id, currentRoom.admin_token, newRestrictions);
                    });

                    label.append(cb, document.createTextNode(` ${receiver.first_name} ${receiver.last_name}`));
                    optionsDiv.appendChild(label);
                });

                block.append(title, optionsDiv);
                hostRestrictionsDiv.appendChild(block);
            });
        }

        // Copy Share Link
        hostCopyLinkBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(hostShareLinkInput.value);
                const originalText = hostCopyLinkBtn.textContent;
                hostCopyLinkBtn.textContent = 'Скопійовано! ✔';
                setTimeout(() => {
                    hostCopyLinkBtn.textContent = originalText;
                }, 2000);
            } catch {
                hostShareLinkInput.select();
                document.execCommand('copy');
                alert('Посилання скопійовано до буфера обміну!');
            }
        });

        // Email Invites Form
        hostEmailInvitesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const raw = hostEmailInvitesInput.value;
            const emails = raw.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);

            if (emails.length === 0) {
                alert('Введіть щонайменше одну адресу email.');
                return;
            }

            const sendBtn = hostEmailInvitesForm.querySelector('button[type="submit"]');
            sendBtn.disabled = true;
            sendBtn.textContent = 'Надсилаємо...';

            try {
                const inviteUrl = hostShareLinkInput.value;
                const result = await backend.sendInvites({
                    roomId: currentRoom.id,
                    adminToken: currentRoom.admin_token,
                    emails,
                    inviteUrl
                });

                if (result.mock) {
                    alert(`[Демо-режим] Запрошення надіслано на ${emails.length} адрес: ${emails.join(', ')}`);
                } else {
                    alert(`Успішно надіслано ${result.sentCount} запрошень!`);
                }
                hostEmailInvitesInput.value = '';
            } catch (err) {
                alert('Помилка відправки запрошень: ' + err.message);
            } finally {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Надіслати запрошення ✉️';
            }
        });

        // Toggle Restrictions View
        hostRestrictionsToggle.addEventListener('change', () => {
            hostRestrictionsDiv.classList.toggle('is-hidden', !hostRestrictionsToggle.checked);
        });

        // Perform Shuffle
        hostShuffleBtn.addEventListener('click', async () => {
            if (currentParticipants.length < 3) {
                alert('Для жеребкування потрібно щонайменше 3 учасники!');
                return;
            }

            const confirmed = confirm(
                'Ви впевнені, що хочете провести жеребкування?\n\n' +
                'Після цього кімната закриється для нових учасників, а кожному учаснику буде надіслано лист із його підопічним.'
            );
            if (!confirmed) return;

            hostShuffleBtn.disabled = true;
            hostShuffleBtn.textContent = '🎅 Жеребкуємо та надсилаємо листи...';

            try {
                const result = await backend.performShuffle({
                    roomId: currentRoom.id,
                    adminToken: currentRoom.admin_token
                });

                if (result.mock) {
                    alert(
                        '🎉 [Демо-режим] Жеребкування успішно проведено!\n\n' +
                        'Оскільки Telegram Bot ще не налаштовано, результати збережено локально. ' +
                        'При підключенні токена бота кожен учасник автоматично отримує святкове повідомлення в Telegram.'
                    );
                } else {
                    alert(`🎉 Жеребкування успішно проведено! Розіслано сповіщення всім учасникам у Telegram.`);
                }

                currentRoom.status = 'shuffled';
                await refreshHostData(currentRoom.id);
            } catch (err) {
                alert('Помилка під час жеребкування:\n' + err.message);
                hostShuffleBtn.disabled = false;
                hostShuffleBtn.textContent = '🎅 Провести жеребкування та розіслати листи';
            }
        });

        // ==========================================
        // Join View (Participant)
        // ==========================================
        async function loadJoinView(roomId) {
            try {
                currentRoom = await backend.getRoom(roomId);
            } catch (err) {
                alert('Не вдалося завантажити інформацію про кімнату: ' + err.message);
                setQueryParams({ tab: 'online', room: null });
                viewCreateRoom.classList.remove('is-hidden');
                return;
            }

            viewJoinRoom.classList.remove('is-hidden');
            document.getElementById('join-room-title').textContent = currentRoom.title;
            document.getElementById('join-host-name').textContent = currentRoom.host_name;

            const isShuffled = currentRoom.status === 'shuffled';
            if (isShuffled) {
                joinFormCard.classList.add('is-hidden');
                joinSuccessCard.classList.remove('is-hidden');
                joinSuccessCard.innerHTML = `
                    <h3>Жеребкування вже завершено 🎅</h3>
                    <p>На жаль, прийом заявок у цю кімнату вже закрито, оскільки хост провів жеребкування і розіслав листи.</p>
                `;
            } else {
                joinFormCard.classList.remove('is-hidden');
                joinSuccessCard.classList.add('is-hidden');
            }
        }

        joinRoomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = joinRoomForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Зберігаємо...';

            const firstName = document.getElementById('join-first-name').value;
            const lastName = document.getElementById('join-last-name').value;
            const email = document.getElementById('join-email').value;
            const wishlist = document.getElementById('join-wishlist').value;

            try {
                await backend.addParticipant({
                    roomId: currentRoom.id,
                    firstName,
                    lastName,
                    email,
                    wishlist
                });

                joinFormCard.classList.add('is-hidden');
                joinSuccessCard.classList.remove('is-hidden');
                document.getElementById('join-success-name').textContent = `${firstName} ${lastName}`;
            } catch (err) {
                alert('Помилка реєстрації: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Взяти участь у Таємному Санті 🎁';
            }
        });

        // ==========================================
        // Cloud Config Modal
        // ==========================================
        function updateCloudStatusUI() {
            const isLive = backend.isLive();
            if (cloudStatusIndicator) {
                cloudStatusIndicator.innerHTML = isLive
                    ? '<span class="status-dot live"></span> Supabase підключено'
                    : '<span class="status-dot demo"></span> Демо-режим (Локальний)';
            }
        }

        if (configBtn) {
            configBtn.addEventListener('click', () => {
                const cfg = ns.config.get();
                configUrlInput.value = cfg.supabaseUrl || '';
                configKeyInput.value = cfg.supabaseAnonKey || '';
                configModal.classList.remove('is-hidden');
            });
        }

        if (configCloseBtn) {
            configCloseBtn.addEventListener('click', () => {
                configModal.classList.add('is-hidden');
            });
        }

        if (configForm) {
            configForm.addEventListener('submit', (e) => {
                e.preventDefault();
                ns.config.set({
                    supabaseUrl: configUrlInput.value.trim(),
                    supabaseAnonKey: configKeyInput.value.trim()
                });
                configModal.classList.add('is-hidden');
                updateCloudStatusUI();
                alert('Налаштування збережено! Сторінку буде оновлено.');
                window.location.reload();
            });
        }

        // ==========================================
        // Boot checking
        // ==========================================
        const initialParams = getQueryParams();
        if (initialParams.tab === 'online' || initialParams.roomId) {
            switchTab('online');
        } else {
            switchTab('offline');
        }
        updateCloudStatusUI();
    }

    ns.initRoomModule = initRoomModule;
})(window.SecretSanta);
