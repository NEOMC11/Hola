// ===== IMPORTAR SUPABASE =====
import { supabase } from './supabase-config.js';

// ===== VARIABLES GLOBALES =====
let currentFilter = 'all';
let isAdminLoggedIn = false;
let currentUser = null;
let allContent = [];
let allVideos = [];
let editingItemId = null;
let currentItemComments = [];
let uploadedImageFile = null;
let uploadedScreenshots = [];
let deferredPrompt = null;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    setupEventListeners();
    checkAuthState();
    loadDataFromSupabase();
    initializePWA();
});

// ===== PWA INSTALLATION =====
function initializePWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('PWA instalable detectada');
        e.preventDefault();
        deferredPrompt = e;
        showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA instalada exitosamente');
        deferredPrompt = null;
        hideInstallButton();
        showToast('¡Aplicación instalada correctamente! 🎉');
    });
}

function showInstallButton() {
    let installBtn = document.getElementById('installBtn');
    
    if (!installBtn) {
        installBtn = document.createElement('button');
        installBtn.id = 'installBtn';
        installBtn.className = 'install-btn';
        installBtn.innerHTML = '<i class="fas fa-download"></i> Instalar App';
        document.body.appendChild(installBtn);
        
        installBtn.addEventListener('click', installPWA);
    }
    
    installBtn.style.display = 'flex';
}

function hideInstallButton() {
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.style.display = 'none';
    }
}

async function installPWA() {
    if (!deferredPrompt) {
        showToast('La aplicación ya está instalada o no se puede instalar', true);
        return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`Usuario eligió: ${outcome}`);
    
    if (outcome === 'accepted') {
        showToast('¡Instalando aplicación...!');
    } else {
        showToast('Instalación cancelada');
    }
    
    deferredPrompt = null;
    hideInstallButton();
}

// ===== AUTENTICACIÓN CON SUPABASE =====
async function checkAuthState() {
    // Verificar sesión actual
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        isAdminLoggedIn = true;
        updateAdminUI(true);
        console.log('Usuario autenticado:', session.user.email);
    } else {
        currentUser = null;
        isAdminLoggedIn = false;
        updateAdminUI(false);
        console.log('Usuario no autenticado');
    }
    
    // Escuchar cambios en autenticación
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            currentUser = session.user;
            isAdminLoggedIn = true;
            updateAdminUI(true);
        } else {
            currentUser = null;
            isAdminLoggedIn = false;
            updateAdminUI(false);
        }
    });
}

function updateAdminUI(isLoggedIn) {
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        if (isLoggedIn) {
            adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Panel Admin';
        } else {
            adminBtn.innerHTML = '<i class="fas fa-lock"></i> Iniciar Sesión';
        }
    }
}

async function adminLogin() {
    const emailInput = document.getElementById('adminEmail');
    const passwordInput = document.getElementById('adminPassword');
    
    if (!emailInput || !passwordInput) return;
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        showToast('Por favor completa todos los campos', true);
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        closeModal();
        showToast('¡Sesión iniciada correctamente!');
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) adminPanel.classList.add('active');
        emailInput.value = '';
        passwordInput.value = '';
    } catch (error) {
        console.error('Error de login:', error);
        let errorMessage = 'Error al iniciar sesión';
        
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Email o contraseña incorrectos';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Debes confirmar tu email primero';
        }
        
        showToast(errorMessage, true);
    }
}

async function adminLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        closeModal();
        showToast('Sesión cerrada');
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showToast('Error al cerrar sesión', true);
    }
}

// ===== CARGAR DATOS DESDE SUPABASE =====
async function loadDataFromSupabase() {
    try {
        await Promise.all([loadContent(), loadVideos()]);
        checkHash();
    } catch (error) {
        console.error('Error al cargar datos:', error);
        showToast('Error al cargar datos', true);
    }
}

async function loadContent() {
    try {
        const { data, error } = await supabase
            .from('content')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allContent = data.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            version: item.version,
            downloadUrl: item.download_url,
            imageUrl: item.image_url,
            type: item.type,
            screenshots: item.screenshots || [],
            videos: item.videos || [],
            downloads: item.downloads || 0,
            createdAt: item.created_at
        }));
        
        console.log('Contenido cargado:', allContent.length, 'items');
        displayContent();
    } catch (error) {
        console.error('Error al cargar contenido:', error);
        showToast('Error al cargar contenido', true);
    }
}

async function loadVideos() {
    try {
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allVideos = data.map(item => ({
            id: item.id,
            title: item.title,
            url: item.url,
            thumbnail: item.thumbnail,
            platform: item.platform || 'youtube',
            createdAt: item.created_at
        }));
        
        console.log('Videos cargados:', allVideos.length, 'items');
        displayVideos();
    } catch (error) {
        console.error('Error al cargar videos:', error);
        showToast('Error al cargar videos', true);
    }
}

function displayContent() {
    const grid = document.getElementById('cardsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const filtered = currentFilter === 'all' 
        ? allContent 
        : allContent.filter(item => item.type === currentFilter);
    
    if (filtered.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1 / -1;">No hay contenido disponible</p>';
        return;
    }
    
    filtered.forEach(item => {
        const card = createCard(item);
        grid.appendChild(card);
    });
}

function displayVideos() {
    const grid = document.getElementById('videosGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (allVideos.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1 / -1;">No hay videos disponibles</p>';
        return;
    }
    
    allVideos.forEach(video => {
        const card = createVideoCard(video);
        grid.appendChild(card);
    });
}

// ===== ESTADÍSTICAS DE DESCARGAS =====
async function trackDownload(itemId) {
    try {
        const { error } = await supabase
            .from('content')
            .update({ downloads: supabase.sql`downloads + 1` })
            .eq('id', itemId);
        
        if (error) throw error;
        
        // Actualizar en memoria
        const item = allContent.find(i => i.id === itemId);
        if (item) {
            item.downloads = (item.downloads || 0) + 1;
            displayContent();
        }
        
        console.log('Descarga registrada para:', itemId);
    } catch (error) {
        console.error('Error al registrar descarga:', error);
    }
}

// ===== SISTEMA DE COMENTARIOS =====
async function loadComments(contentId) {
    try {
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .eq('content_id', contentId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        currentItemComments = data.map(comment => ({
            id: comment.id,
            userName: comment.user_name,
            text: comment.text,
            createdAt: comment.created_at
        }));
        
        console.log('Comentarios cargados:', currentItemComments.length);
        return currentItemComments;
    } catch (error) {
        console.error('Error al cargar comentarios:', error);
        return [];
    }
}

async function addComment(contentId, userName, commentText) {
    try {
        const { error } = await supabase
            .from('comments')
            .insert([{
                content_id: contentId,
                user_name: userName,
                text: commentText
            }]);
        
        if (error) throw error;
        
        console.log('Comentario agregado exitosamente');
        showToast('¡Comentario publicado!');
        return true;
    } catch (error) {
        console.error('Error al agregar comentario:', error);
        showToast('Error al publicar comentario', true);
        return false;
    }
}

async function deleteComment(contentId, commentId) {
    try {
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);
        
        if (error) throw error;
        
        console.log('Comentario eliminado');
        showToast('Comentario eliminado');
        return true;
    } catch (error) {
        console.error('Error al eliminar comentario:', error);
        showToast('Error al eliminar comentario', true);
        return false;
    }
}

// ===== FORMATEAR FECHA =====
function formatDate(timestamp) {
    if (!timestamp) return 'Ahora';
    
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `Hace ${minutes}m`;
        if (hours < 24) return `Hace ${hours}h`;
        if (days < 7) return `Hace ${days}d`;
        
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch (error) {
        console.error('Error al formatear fecha:', error);
        return 'Hace un momento';
    }
}

// ===== TEMA =====
function initializeTheme() {
    const savedTheme = localStorage.getItem('gamestore_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = savedTheme === 'light';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('gamestore_theme', newTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = newTheme === 'light';
    }
}

// Continúa en el siguiente mensaje debido a límite de caracteres...
// ===== CONTINUACIÓN DEL APP.JS =====
// Agregar estas funciones al final del app.js anterior

// ===== NAVEGACIÓN Y EVENTOS =====
function setupEventListeners() {
    const menuBtn = document.getElementById('menuBtn');
    const closeSidebar = document.getElementById('closeSidebar');
    const overlay = document.getElementById('overlay');
    
    if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
    if (closeSidebar) closeSidebar.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', toggleSidebar);
    
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleMobile = document.getElementById('themeToggleMobile');
    
    if (themeToggle) themeToggle.addEventListener('change', toggleTheme);
    if (themeToggleMobile) themeToggleMobile.addEventListener('click', toggleTheme);
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterContent(btn.dataset.filter));
    });
    
    const adminBtn = document.getElementById('adminBtn');
    const closeLoginModal = document.getElementById('closeLoginModal');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const closeAdminPanel = document.getElementById('closeAdminPanel');
    
    if (adminBtn) adminBtn.addEventListener('click', showLoginModal);
    if (closeLoginModal) closeLoginModal.addEventListener('click', closeModal);
    if (loginBtn) loginBtn.addEventListener('click', adminLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', adminLogout);
    if (closeAdminPanel) closeAdminPanel.addEventListener('click', closeModal);
    
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchAdminTab(btn.dataset.tab));
    });
    
    const contentForm = document.getElementById('contentForm');
    const videoForm = document.getElementById('videoForm');
    
    if (contentForm) contentForm.addEventListener('submit', submitContent);
    if (videoForm) videoForm.addEventListener('submit', submitVideo);
    
    const closeDetailModal = document.getElementById('closeDetailModal');
    const closeVideoModal = document.getElementById('closeVideoModal');
    
    if (closeDetailModal) closeDetailModal.addEventListener('click', closeModal);
    if (closeVideoModal) closeVideoModal.addEventListener('click', closeModal);
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', handleSearch);
    
    const contentImage = document.getElementById('contentImage');
    if (contentImage) contentImage.addEventListener('change', handleImageUpload);
    
    const screenshotsInput = document.getElementById('contentScreenshotsFiles');
    if (screenshotsInput) screenshotsInput.addEventListener('change', handleScreenshotsUpload);
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    });
    
    window.addEventListener('hashchange', checkHash);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

function switchSection(section) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === section);
    });
    
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.toggle('active', sec.id === section);
    });
    
    if (section === 'search') {
        setTimeout(() => {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.focus();
        }, 300);
    }
}

function filterContent(filter) {
    currentFilter = filter;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    displayContent();
}

// ===== CREAR CARDS =====
function createCard(item) {
    const card = document.createElement('div');
    card.className = 'card';
    
    const downloads = item.downloads || 0;
    
    card.innerHTML = `
        <img src="${item.imageUrl}" alt="${item.name}" class="card-image" onerror="this.src='https://via.placeholder.com/300x180?text=No+Image'">
        <div class="card-content">
            <div class="card-header">
                <h3 class="card-title">${item.name}</h3>
                <span class="card-version">${item.version}</span>
            </div>
            <p class="card-description">${item.description.substring(0, 100)}...</p>
            <div class="card-stats">
                <span class="stat-item">
                    <i class="fas fa-download"></i>
                    ${downloads.toLocaleString()} descargas
                </span>
            </div>
            ${isAdminLoggedIn ? `
                <div class="card-admin-actions">
                    <button class="btn-edit" data-id="${item.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-delete" data-id="${item.id}" data-type="content">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.card-admin-actions')) {
            showDetail(item);
        }
    });
    
    if (isAdminLoggedIn) {
        const editBtn = card.querySelector('.btn-edit');
        const deleteBtn = card.querySelector('.btn-delete');
        
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                editItem(item.id);
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteItem(item.id, 'content');
            });
        }
    }
    
    return card;
}

function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
        <div class="video-thumbnail">
            <img src="${video.thumbnail}" alt="${video.title}" onerror="this.src='https://via.placeholder.com/300x180?text=No+Image'">
            <div class="play-icon">
                <i class="fas fa-play"></i>
            </div>
        </div>
        <div class="video-info">
            <div class="video-title">${video.title}</div>
            ${isAdminLoggedIn ? `
                <div class="card-admin-actions">
                    <button class="btn-delete" data-id="${video.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    
    const thumbnail = card.querySelector('.video-thumbnail');
    if (thumbnail) {
        thumbnail.addEventListener('click', (e) => {
            if (!e.target.closest('.card-admin-actions')) {
                showVideo(video);
            }
        });
    }
    
    if (isAdminLoggedIn) {
        const deleteBtn = card.querySelector('.btn-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteVideo(video.id);
            });
        }
    }
    
    return card;
}

// ===== SUBIR ARCHIVOS A SUPABASE STORAGE =====
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            showToast('La imagen no debe superar 5MB', true);
            e.target.value = '';
            return;
        }
        uploadedImageFile = file;
        console.log('Imagen seleccionada:', file.name, file.size, 'bytes');
        showToast('Imagen seleccionada: ' + file.name);
    }
}

function handleScreenshotsUpload(e) {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    const invalidFiles = files.filter(f => f.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
        showToast(`${invalidFiles.length} imagen(es) superan los 5MB`, true);
        e.target.value = '';
        return;
    }
    
    uploadedScreenshots = files;
    console.log('Screenshots seleccionadas:', files.length);
    showToast(`${files.length} imagen(es) seleccionada(s)`);
}

async function uploadImageToSupabase(file, path) {
    try {
        console.log('Subiendo imagen a:', path);
        
        const { data, error } = await supabase.storage
            .from('images')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
            .from('images')
            .getPublicUrl(path);
        
        console.log('Imagen subida exitosamente:', urlData.publicUrl);
        return urlData.publicUrl;
    } catch (error) {
        console.error('Error al subir imagen:', error);
        throw error;
    }
}

async function uploadMultipleImages(files, bucket) {
    const uploadPromises = files.map(async (file, index) => {
        const path = `${Date.now()}_${index}_${file.name}`;
        
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file);
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);
        
        return urlData.publicUrl;
    });
    
    return await Promise.all(uploadPromises);
}

// ===== CREAR/EDITAR CONTENIDO =====
async function submitContent(e) {
    e.preventDefault();
    
    if (!isAdminLoggedIn) {
        showToast('Debes iniciar sesión como administrador', true);
        return;
    }
    
    const name = document.getElementById('contentName').value.trim();
    const description = document.getElementById('contentDescription').value.trim();
    const version = document.getElementById('contentVersion').value.trim();
    const downloadUrl = document.getElementById('contentDownload').value.trim();
    const type = document.getElementById('contentType').value;
    const videosInput = document.getElementById('contentVideos').value.trim();
    
    if (!name || !description || !version || !downloadUrl) {
        showToast('Por favor completa todos los campos obligatorios', true);
        return;
    }
    
    try {
        showToast('Guardando contenido...');
        console.log('Iniciando subida de contenido...');
        
        let imageUrl = document.getElementById('contentImageUrl')?.value.trim() || '';
        
        if (uploadedImageFile) {
            console.log('Subiendo imagen principal...');
            const imagePath = `content/${Date.now()}_${uploadedImageFile.name}`;
            imageUrl = await uploadImageToSupabase(uploadedImageFile, imagePath);
            showToast('Imagen principal subida exitosamente');
        }
        
        let screenshots = [];
        if (uploadedScreenshots && uploadedScreenshots.length > 0) {
            console.log(`Subiendo ${uploadedScreenshots.length} capturas...`);
            showToast(`Subiendo ${uploadedScreenshots.length} capturas...`);
            screenshots = await uploadMultipleImages(uploadedScreenshots, 'screenshots');
            showToast('Capturas subidas exitosamente');
        }
        
        const screenshotsInput = document.getElementById('contentScreenshots').value.trim();
        if (screenshotsInput) {
            const urlScreenshots = screenshotsInput.split(',').map(s => s.trim()).filter(s => s);
            screenshots = [...screenshots, ...urlScreenshots];
        }
        
        const videos = videosInput 
            ? videosInput.split(',').map(v => v.trim()).filter(v => v)
            : [];
        
        const contentData = {
            name,
            description,
            version,
            download_url: downloadUrl,
            image_url: imageUrl,
            type,
            screenshots,
            videos,
            downloads: 0
        };
        
        if (editingItemId) {
            console.log('Actualizando contenido:', editingItemId);
            const existingItem = allContent.find(i => i.id === editingItemId);
            if (existingItem && existingItem.downloads) {
                contentData.downloads = existingItem.downloads;
            }
            
            const { error } = await supabase
                .from('content')
                .update(contentData)
                .eq('id', editingItemId);
            
            if (error) throw error;
            
            showToast('¡Contenido actualizado!');
            editingItemId = null;
        } else {
            console.log('Creando nuevo contenido');
            const { error } = await supabase
                .from('content')
                .insert([contentData]);
            
            if (error) throw error;
            
            showToast('¡Contenido publicado!');
        }
        
        clearContentForm();
        await loadContent();
        closeModal();
        
    } catch (error) {
        console.error('Error al guardar:', error);
        showToast('Error al guardar el contenido: ' + error.message, true);
    }
}

// Continúa en las funciones de comentarios, modales, etc...
// ===== CONTINUACIÓN FINAL DEL APP.JS =====
// Agregar al final de las partes anteriores

// ===== CREAR VIDEO =====
async function submitVideo(e) {
    e.preventDefault();
    
    if (!isAdminLoggedIn) {
        showToast('Debes iniciar sesión como administrador', true);
        return;
    }
    
    const title = document.getElementById('videoTitle').value.trim();
    let url = document.getElementById('videoUrl').value.trim();
    const thumbnail = document.getElementById('videoThumbnail').value.trim();
    
    if (!title || !url || !thumbnail) {
        showToast('Por favor completa todos los campos', true);
        return;
    }
    
    try {
        showToast('Guardando video...');
        
        if (url.includes('youtube.com/watch')) {
            const videoId = url.split('v=')[1]?.split('&')[0];
            if (videoId) {
                url = `https://www.youtube.com/embed/${videoId}`;
            }
        } else if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1]?.split('?')[0];
            if (videoId) {
                url = `https://www.youtube.com/embed/${videoId}`;
            }
        }
        
        const { error } = await supabase
            .from('videos')
            .insert([{
                title,
                url,
                thumbnail,
                platform: 'youtube'
            }]);
        
        if (error) throw error;
        
        showToast('¡Video publicado!');
        document.getElementById('videoForm').reset();
        await loadVideos();
        closeModal();
        
    } catch (error) {
        console.error('Error al guardar video:', error);
        showToast('Error al guardar el video: ' + error.message, true);
    }
}

// ===== ELIMINAR VIDEO =====
async function deleteVideo(videoId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este video?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('videos')
            .delete()
            .eq('id', videoId);
        
        if (error) throw error;
        
        showToast('¡Video eliminado!');
        await loadVideos();
    } catch (error) {
        console.error('Error al eliminar video:', error);
        showToast('Error al eliminar el video', true);
    }
}

// ===== EDITAR ITEM =====
async function editItem(itemId) {
    const item = allContent.find(i => i.id === itemId);
    if (!item) return;
    
    console.log('Editando item:', itemId);
    editingItemId = itemId;
    
    document.getElementById('contentName').value = item.name;
    document.getElementById('contentDescription').value = item.description;
    document.getElementById('contentVersion').value = item.version;
    document.getElementById('contentDownload').value = item.downloadUrl;
    document.getElementById('contentImageUrl').value = item.imageUrl;
    document.getElementById('contentType').value = item.type;
    
    const screenshotsFilesInput = document.getElementById('contentScreenshotsFiles');
    if (screenshotsFilesInput) screenshotsFilesInput.value = '';
    uploadedScreenshots = [];
    
    const urlScreenshots = item.screenshots?.filter(s => s.startsWith('http')) || [];
    document.getElementById('contentScreenshots').value = urlScreenshots.join(', ');
    
    document.getElementById('contentVideos').value = item.videos?.join(', ') || '';
    
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) adminPanel.classList.add('active');
    
    switchAdminTab('content');
    showToast('Editando contenido...');
}

// ===== ELIMINAR ITEM =====
async function deleteItem(itemId, collectionName) {
    if (!confirm('¿Estás seguro de que quieres eliminar este elemento?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from(collectionName)
            .delete()
            .eq('id', itemId);
        
        if (error) throw error;
        
        showToast('¡Elemento eliminado!');
        
        if (collectionName === 'content') {
            await loadContent();
        } else {
            await loadVideos();
        }
    } catch (error) {
        console.error('Error al eliminar:', error);
        showToast('Error al eliminar el elemento', true);
    }
}

function clearContentForm() {
    const form = document.getElementById('contentForm');
    if (form) form.reset();
    uploadedImageFile = null;
    uploadedScreenshots = [];
    editingItemId = null;
    
    const imageInput = document.getElementById('contentImage');
    const screenshotsInput = document.getElementById('contentScreenshotsFiles');
    if (imageInput) imageInput.value = '';
    if (screenshotsInput) screenshotsInput.value = '';
}

// ===== MOSTRAR DETALLES CON COMENTARIOS =====
async function showDetail(item) {
    window.location.hash = item.id;
    
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');
    
    if (!modal || !content) return;
    
    const comments = await loadComments(item.id);
    
    let screenshotsHTML = '';
    if (item.screenshots && item.screenshots.length > 0) {
        screenshotsHTML = `
            <div class="detail-screenshots">
                <h3>Capturas</h3>
                <div class="screenshots-grid">
                    ${item.screenshots.map(img => `
                        <img src="${img}" alt="Screenshot" class="screenshot-img" onerror="this.src='https://via.placeholder.com/150x120?text=No+Image'">
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    let videosHTML = '';
    if (item.videos && item.videos.length > 0) {
        videosHTML = `
            <div class="detail-videos">
                <h3>Videos</h3>
                <div class="videos-list">
                    ${item.videos.map((video, index) => `
                        <a href="${video}" target="_blank" class="video-link">
                            <i class="fab fa-youtube"></i>
                            <span>Ver video ${index + 1}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    const downloads = item.downloads || 0;
    
    let commentsHTML = `
        <div class="comments-section">
            <h3>💬 Comentarios (${comments.length})</h3>
            
            <div class="comment-form">
                <input type="text" id="commentUserName" placeholder="Tu nombre" class="comment-input">
                <textarea id="commentText" placeholder="Escribe tu comentario..." rows="3" class="comment-textarea"></textarea>
                <button class="btn-comment-submit" id="submitCommentBtn" data-content-id="${item.id}">
                    <i class="fas fa-paper-plane"></i> Publicar
                </button>
            </div>
            
            <div class="comments-list" id="commentsList">
                ${comments.length === 0 ? '<p class="no-comments">No hay comentarios aún. ¡Sé el primero!</p>' : ''}
                ${comments.map(comment => `
                    <div class="comment-item" data-comment-id="${comment.id}">
                        <div class="comment-header">
                            <span class="comment-author"><i class="fas fa-user"></i> ${comment.userName}</span>
                            <span class="comment-date">${formatDate(comment.createdAt)}</span>
                            ${isAdminLoggedIn ? `
                                <button class="btn-comment-delete" data-content-id="${item.id}" data-comment-id="${comment.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                        <p class="comment-text">${comment.text}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    content.innerHTML = `
        <div class="detail-header">
            <img src="${item.imageUrl}" alt="${item.name}" class="detail-image" onerror="this.src='https://via.placeholder.com/150?text=No+Image'">
            <h2 class="detail-title">${item.name}</h2>
            <span class="detail-version">${item.version}</span>
            <div class="detail-stats">
                <span class="detail-stat">
                    <i class="fas fa-download"></i>
                    ${downloads.toLocaleString()} descargas
                </span>
                <span class="detail-stat">
                    <i class="fas fa-comments"></i>
                    ${comments.length} comentarios
                </span>
            </div>
        </div>
        
        <div class="detail-description">
            <h3>Descripción</h3>
            <p>${item.description}</p>
        </div>
        
        ${screenshotsHTML}
        ${videosHTML}
        
        <div class="detail-actions">
            <button class="btn-download-large" id="downloadBtn" data-url="${item.downloadUrl}" data-id="${item.id}">
                <i class="fas fa-download"></i>
                Descargar
            </button>
            <button class="btn-copy-link" id="copyLinkBtn">
                <i class="fas fa-link"></i>
                Copiar Link
            </button>
        </div>
        
        ${commentsHTML}
    `;
    
    const downloadBtn = content.querySelector('#downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            downloadItem(this.dataset.url, this.dataset.id);
        });
    }
    
    const copyLinkBtn = content.querySelector('#copyLinkBtn');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', copyCurrentLink);
    }
    
    const submitCommentBtn = content.querySelector('#submitCommentBtn');
    if (submitCommentBtn) {
        submitCommentBtn.addEventListener('click', function() {
            submitComment(this.dataset.contentId);
        });
    }
    
    const deleteCommentBtns = content.querySelectorAll('.btn-comment-delete');
    deleteCommentBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            removeComment(this.dataset.contentId, this.dataset.commentId);
        });
    });
    
    modal.classList.add('active');
}

// ===== MOSTRAR VIDEO =====
function showVideo(video) {
    const modal = document.getElementById('videoModal');
    const content = document.getElementById('videoContent');
    
    if (!modal || !content) return;
    
    let embedUrl = video.url;
    
    if (video.url.includes('youtube.com/watch')) {
        const videoId = video.url.split('v=')[1]?.split('&')[0];
        if (videoId) {
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
    } else if (video.url.includes('youtu.be/')) {
        const videoId = video.url.split('youtu.be/')[1]?.split('?')[0];
        if (videoId) {
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
    }
    
    content.innerHTML = `
        <h3 style="margin-bottom: 15px; color: var(--primary-color);">${video.title}</h3>
        <div class="video-embed">
            <iframe src="${embedUrl}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
        </div>
    `;
    
    modal.classList.add('active');
}

// ===== COMENTARIOS =====
async function submitComment(contentId) {
    const userNameInput = document.getElementById('commentUserName');
    const commentTextInput = document.getElementById('commentText');
    
    if (!userNameInput || !commentTextInput) return;
    
    const userName = userNameInput.value.trim();
    const commentText = commentTextInput.value.trim();
    
    if (!userName || !commentText) {
        showToast('Por favor completa tu nombre y comentario', true);
        return;
    }
    
    const success = await addComment(contentId, userName, commentText);
    
    if (success) {
        userNameInput.value = '';
        commentTextInput.value = '';
        
        const item = allContent.find(i => i.id === contentId);
        if (item) {
            await showDetail(item);
        }
    }
}

async function removeComment(contentId, commentId) {
    if (!confirm('¿Eliminar este comentario?')) return;
    
    const success = await deleteComment(contentId, commentId);
    
    if (success) {
        const item = allContent.find(i => i.id === contentId);
        if (item) {
            await showDetail(item);
        }
    }
}

// ===== BÚSQUEDA =====
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    const resultsContainer = document.getElementById('searchResults');
    
    if (!resultsContainer) return;
    
    if (query === '') {
        resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Escribe para buscar...</p>';
        return;
    }
    
    const results = allContent.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.version.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query)
    );
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No se encontraron resultados</p>';
        return;
    }
    
    resultsContainer.innerHTML = '';
    results.forEach(item => {
        const card = createCard(item);
        resultsContainer.appendChild(card);
    });
}

// ===== UTILIDADES =====
function showLoginModal() {
    if (isAdminLoggedIn) {
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) adminPanel.classList.add('active');
    } else {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('active');
    }
}

function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tab}Tab`);
    });
    
    if (tab === 'content') {
        clearContentForm();
    }
}

async function downloadItem(url, itemId) {
    console.log('Iniciando descarga:', url, itemId);
    window.open(url, '_blank');
    showToast('Iniciando descarga...');
    
    if (itemId) {
        await trackDownload(itemId);
    }
}

function copyCurrentLink() {
    const link = window.location.href;
    
    navigator.clipboard.writeText(link).then(() => {
        showToast('¡Enlace copiado!');
    }).catch(() => {
        showToast('Error al copiar enlace', true);
    });
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    
    if (window.location.hash) {
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    if (isError) {
        toast.style.background = 'linear-gradient(135deg, #FF4444, #CC0000)';
    } else {
        toast.style.background = 'linear-gradient(135deg, var(--primary-blue), var(--neon-blue))';
    }
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function checkHash() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const item = allContent.find(i => i.id === hash);
        if (item) {
            showDetail(item);
        }
    }
}