const currentUserId = 'user1'; // Для демо, в реальном проекте используйте аутентификацию
let currentTargetId = null;

document.getElementById('profileForm').addEventListener('submit', saveProfile);

async function saveProfile(e) {
    e.preventDefault();
    const profile = {
        userId: currentUserId,
        photo: document.getElementById('photo').value,
        name: document.getElementById('name').value,
        city: document.getElementById('city').value,
        age: document.getElementById('age').value || null,
        gender: document.getElementById('gender').value,
        searchGender: document.getElementById('searchGender').value,
        about: document.getElementById('about').value
    };

    await fetch('http://localhost:3000/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
    });
    closeModal();
    showProfile();
}

async function showProfile() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = '';
    const response = await fetch(`http://localhost:3000/api/profile/${currentUserId}`);
    const profile = await response.json();
    if (profile) {
        mainContent.innerHTML = createProfileCard(profile, false);
    } else {
        mainContent.innerHTML = '<p>Создайте анкету!</p>';
    }
}

async function searchProfiles() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = '';
    const response = await fetch(`http://localhost:3000/api/search/${currentUserId}`);
    const profiles = await response.json();
    profiles.forEach(profile => {
        mainContent.innerHTML += createProfileCard(profile, true);
    });
    if (!profiles.length) mainContent.innerHTML = '<p>Нет подходящих анкет</p>';
}

function createProfileCard(profile, showButtons) {
    return `
        <div class="profile-card">
            <img src="${profile.photo}" class="profile-image" alt="${profile.name}">
            <div class="profile-info">
                <h2>${profile.name}, ${profile.age || 'Не указан'}</h2>
                <p>📍 ${profile.city}</p>
                <p>🚻 ${profile.gender}</p>
                ${profile.about ? `<p>${profile.about}</p>` : ''}
                <p class="rating">⭐ ${Math.round(profile.rating)}/10 (${profile.ratedBy} оценок)</p>
                <p>Активна: ${profile.isActive ? 'Да' : 'Нет'}</p>
            </div>
            ${showButtons ? `
            <div class="action-buttons">
                <button onclick="likeProfile('${profile.userId}')">❤️</button>
                <button onclick="messageProfile('${profile.userId}')">💌</button>
                <button onclick="dislikeProfile('${profile.userId}')">👎</button>
                <button onclick="reportProfile('${profile.userId}')">⚠️</button>
            </div>` : ''}
        </div>
    `;
}

async function likeProfile(targetId) {
    await fetch('http://localhost:3000/api/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, targetId, action: 'like' })
    });
    alert('❤️ Вы поставили лайк!');
    searchProfiles();
}

async function dislikeProfile(targetId) {
    await fetch('http://localhost:3000/api/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, targetId, action: 'dislike' })
    });
    alert('👎 Вы поставили дизлайк');
    searchProfiles();
}

function messageProfile(targetId) {
    currentTargetId = targetId;
    document.getElementById('messageModal').style.display = 'block';
    document.getElementById('messageText').value = '';
    updateMessageList();
}

function reportProfile(targetId) {
    alert('⚠️ Жалоба отправлена администрации');
    searchProfiles();
}

async function stopSearch() {
    const profile = await (await fetch(`http://localhost:3000/api/profile/${currentUserId}`)).json();
    if (profile) {
        profile.isActive = false;
        await fetch('http://localhost:3000/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profile)
        });
        alert('Поиск остановлен');
        showProfile();
    }
}

async function sendMessage() {
    const text = document.getElementById('messageText').value.trim();
    if (!text || !currentTargetId) return;

    await fetch('http://localhost:3000/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUserId, targetId: currentTargetId, text })
    });
    alert('Сообщение отправлено!');
    document.getElementById('messageText').value = '';
    updateMessageList();
}

async function updateMessageList() {
    const messageList = document.getElementById('messageList');
    messageList.innerHTML = '';
    const response = await fetch(`http://localhost:3000/api/messages/${currentUserId}/${currentTargetId}`);
    const messages = await response.json();
    messages.forEach(msg => {
        messageList.innerHTML += `
            <p style="color: ${msg.senderId === currentUserId ? '#e0e0e0' : '#b0b3b8'}">
                ${msg.text} <small>(${new Date(msg.timestamp).toLocaleTimeString()})</small>
            </p>`;
    });
}

function showEditModal() {
    const modal = document.getElementById('editModal');
    fetch(`http://localhost:3000/api/profile/${currentUserId}`)
        .then(res => res.json())
        .then(profile => {
            document.getElementById('photo').value = profile?.photo || '';
            document.getElementById('name').value = profile?.name || '';
            document.getElementById('city').value = profile?.city || '';
            document.getElementById('age').value = profile?.age || '';
            document.getElementById('gender').value = profile?.gender || 'Мужчина';
            document.getElementById('searchGender').value = profile?.searchGender || 'Женщина';
            document.getElementById('about').value = profile?.about || '';
        });
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

function closeMessageModal() {
    document.getElementById('messageModal').style.display = 'none';
    currentTargetId = null;
}

searchProfiles();