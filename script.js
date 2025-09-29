// script.js - VERSIÓN COMPLETA CORREGIDA
document.addEventListener('DOMContentLoaded', () => {
    // Sistema de Navegación por Pestañas
    const tabLinks = document.querySelectorAll('.tab-link');
    const contents = document.querySelectorAll('.tab-content');

    let initialLoad = true;

    function showTab(targetId) {
        // Ocultar todas las secciones
        contents.forEach((section) => {
            section.classList.remove('active');
        });
        // Desactivar todos los botones
        tabLinks.forEach((btn) => {
            btn.classList.remove('active');
        });
        // Mostrar la sección seleccionada
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        // Activar el botón correspondiente
        const activeButton = document.querySelector(`.tab-link[data-target="${targetId}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        // Guardar la pestaña activa en localStorage
        localStorage.setItem('activeTab', targetId);

        // Si es la pestaña de historias, cargar las historias
        if (targetId === 'tu-historia') {
            if (window.storyManager) {
                window.storyManager.loadStories();
            }
        }
    }

    // Asociar eventos de clic a cada pestaña
    tabLinks.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.getAttribute('data-target');
            showTab(targetId);
        });
    });

    // Mostrar la pestaña activa al cargar la página
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab) {
        showTab(savedTab);
    } else {
        showTab('intro');
    }

    /* ---------------------------------- */
    /* Sistema de Gestión de Historias    */
    /* ---------------------------------- */
    class MySQLStoryManager {
        constructor() {
            this.apiUrl = 'httpS://piratafivor.com/tejiendocultura/api.php';
            this.currentStories = [];
            this.filters = {
                search: '',
                type: '',
                sort: 'newest'
            };
            this.init();
        }

        async init() {
            await this.loadStories();
            this.setupFormHandler();
            this.setupFilters();
            this.setupModal();
            this.updateStats(); // ✅ Ahora existe esta función
        }

        async loadStories() {
            try {
                this.showLoading(true);
                
                const params = new URLSearchParams();
                if (this.filters.search) params.append('search', this.filters.search);
                if (this.filters.type) params.append('type', this.filters.type);
                if (this.filters.sort) params.append('sort', this.filters.sort);

                console.log('🔍 Cargando historias...');
                const response = await fetch(`${this.apiUrl}?${params}`);
                
                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log('📨 Respuesta del servidor:', data);
                
                if (data.status === 'success' && Array.isArray(data.data)) {
                    this.currentStories = data.data;
                } else if (data.error) {
                    throw new Error(data.error);
                } else {
                    this.currentStories = [];
                }
                
                this.displayStories(this.currentStories);
                this.updateStats(); // ✅ Llamada corregida
                
            } catch (error) {
                console.error('❌ Error al cargar historias:', error);
                this.showAlert(`Error al cargar las historias: ${error.message}`, 'error');
                this.currentStories = [];
                this.displayStories([]);
            } finally {
                this.showLoading(false);
            }
        }

        async saveStory(storyData) {
            try {
                console.log('💾 Guardando historia:', storyData);
                
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(storyData)
                });

                console.log('📊 Status de respuesta:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Error del servidor:', errorText);
                    throw new Error(`Error ${response.status}: ${errorText}`);
                }

                const savedStory = await response.json();
                console.log('✅ Historia guardada:', savedStory);
                return savedStory;
                
            } catch (error) {
                console.error('❌ Error al guardar:', error);
                throw new Error(`No se pudo guardar la historia: ${error.message}`);
            }
        }

        getShareValue() {
            const shareYes = document.getElementById('share-yes');
            const shareNo = document.getElementById('share-no');
            
            if (shareYes && shareYes.checked) return 'yes';
            if (shareNo && shareNo.checked) return 'no';
            return 'no';
        }

        async handleFormSubmit(form) {
            const storyData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                location: document.getElementById('location').value.trim(),
                storyType: document.getElementById('story-type').value,
                story: document.getElementById('story').value.trim(),
                share: this.getShareValue()
            };

            console.log('📝 Datos del formulario:', storyData);

            if (!this.validateStory(storyData)) {
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            try {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
                submitBtn.disabled = true;

                const result = await this.saveStory(storyData);

                if (result.status === 'success') {
                    this.showAlert('¡Gracias por compartir tu historia! Tu testimonio ha sido guardado correctamente.', 'success');
                    
                    await this.loadStories();
                    form.reset();
                    this.validateStoryLength(document.getElementById('story'));
                    
                    setTimeout(() => {
                        const storiesTab = document.querySelector('[data-target="tu-historia"]');
                        if (storiesTab) storiesTab.click();
                    }, 2000);
                } else {
                    throw new Error(result.message || 'Error desconocido del servidor');
                }

            } catch (error) {
                console.error('❌ Error en submit:', error);
                this.showAlert(error.message || 'Error al guardar la historia. Intenta nuevamente.', 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }

        setupFormHandler() {
            const form = document.getElementById('story-form');
            if (!form) {
                console.error('❌ No se encontró el formulario con id "story-form"');
                return;
            }

            console.log('✅ Formulario encontrado, configurando handler...');

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('🖱️ Formulario enviado');
                this.handleFormSubmit(form);
            });

            const storyTextarea = document.getElementById('story');
            if (storyTextarea) {
                storyTextarea.addEventListener('input', (e) => {
                    this.validateStoryLength(e.target);
                });
                this.validateStoryLength(storyTextarea);
            }

            const shareYes = document.getElementById('share-yes');
            const shareNo = document.getElementById('share-no');
            if (shareYes && shareNo) {
                shareYes.checked = true;
            }
        }

        displayStories(stories) {
            const gallery = document.getElementById('stories-gallery');
            if (!gallery) {
                console.error('❌ No se encontró el contenedor de historias');
                return;
            }
            
            console.log(`📚 Mostrando ${stories.length} historias`);

            if (stories.length === 0) {
                gallery.innerHTML = `
                    <div class="no-stories">
                        <i class="fas fa-book" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <p>${this.filters.search || this.filters.type ? 'No se encontraron historias que coincidan con los filtros.' : 'Aún no hay historias compartidas. ¡Sé el primero en compartir tu experiencia!'}</p>
                    </div>
                `;
                return;
            }

            gallery.innerHTML = stories.map(story => `
                <div class="story-card">
                    <div class="story-header">
                        <div class="story-author">${this.escapeHtml(story.name)}</div>
                        <div class="story-date">${this.formatDate(story.created_at)}</div>
                    </div>
                    <div class="story-type">${this.getStoryTypeLabel(story.storyType)}</div>
                    ${story.location ? `
                        <div class="story-location">
                            <i class="fas fa-map-marker-alt"></i> 
                            ${this.escapeHtml(story.location)}
                        </div>
                    ` : ''}
                    <div class="story-content">
                        ${this.truncateText(this.escapeHtml(story.story), 200)}
                    </div>
                    <div class="story-actions">
                        <button class="btn" onclick="storyManager.viewStory(${story.id})">
                            <i class="fas fa-eye"></i> Ver completa
                        </button>
                    </div>
                </div>
            `).join('');
        }

        // ✅ FUNCIÓN updateStats COMPLETADA
        updateStats() {
            try {
                const totalStories = document.getElementById('total-stories');
                const publicStoriesEl = document.getElementById('public-stories');
                const storiesThisMonthEl = document.getElementById('stories-this-month');

                if (!totalStories && !publicStoriesEl && !storiesThisMonthEl) {
                    console.log('ℹ️ No se encontraron elementos de estadísticas');
                    return;
                }

                const publicStories = this.currentStories.filter(story => story.share === 'yes');
                const thisMonth = new Date().getMonth();
                const thisYear = new Date().getFullYear();
                
                const storiesThisMonth = this.currentStories.filter(story => {
                    try {
                        const storyDate = new Date(story.created_at);
                        return storyDate.getMonth() === thisMonth && 
                               storyDate.getFullYear() === thisYear;
                    } catch (e) {
                        return false;
                    }
                });

                if (totalStories) totalStories.textContent = this.currentStories.length;
                if (publicStoriesEl) publicStoriesEl.textContent = publicStories.length;
                if (storiesThisMonthEl) storiesThisMonthEl.textContent = storiesThisMonth.length;

                console.log('📊 Estadísticas actualizadas:', {
                    total: this.currentStories.length,
                    public: publicStories.length,
                    thisMonth: storiesThisMonth.length
                });

            } catch (error) {
                console.error('❌ Error en updateStats:', error);
            }
        }

        // ✅ FUNCIÓN viewStats COMPLETADA
        viewStats() {
            const stats = {
                total: this.currentStories.length,
                public: this.currentStories.filter(story => story.share === 'yes').length,
                private: this.currentStories.filter(story => story.share === 'no').length
            };
            
            console.log('📈 Estadísticas:', stats);
            this.showAlert(`Total: ${stats.total} historias (${stats.public} públicas, ${stats.private} privadas)`, 'success');
        }

        // ✅ FUNCIÓN viewStory COMPLETADA
        viewStory(storyId) {
            const story = this.currentStories.find(s => s.id == storyId);
            if (!story) {
                this.showAlert('Historia no encontrada', 'error');
                return;
            }

            const modalContent = document.getElementById('modal-content');
            const modal = document.getElementById('story-modal');
            
            if (!modalContent || !modal) {
                this.showAlert('No se puede mostrar la historia completa', 'error');
                return;
            }

            modalContent.innerHTML = `
                <h3>Historia de ${this.escapeHtml(story.name)}</h3>
                <div class="story-type">${this.getStoryTypeLabel(story.storyType)}</div>
                ${story.location ? `
                    <div class="story-location">
                        <i class="fas fa-map-marker-alt"></i> 
                        ${this.escapeHtml(story.location)}
                    </div>
                ` : ''}
                <div class="story-date">Publicado el ${this.formatDate(story.created_at)}</div>
                <div class="story-content" style="margin-top: 1rem; white-space: pre-line; line-height: 1.6;">
                    ${this.escapeHtml(story.story)}
                </div>
                ${story.email ? `
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee;">
                        <strong>Contacto:</strong> ${this.escapeHtml(story.email)}
                    </div>
                ` : ''}
            `;

            modal.style.display = 'flex';
        }

        setupFilters() {
            const searchInput = document.getElementById('search-stories');
            const filterType = document.getElementById('filter-type');
            const sortBy = document.getElementById('sort-by');
            const clearSearch = document.getElementById('clear-search');

            if (searchInput) {
                let searchTimeout;
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.filters.search = e.target.value;
                        this.loadStories();
                    }, 300);
                });
            }

            if (filterType) {
                filterType.addEventListener('change', (e) => {
                    this.filters.type = e.target.value;
                    this.loadStories();
                });
            }

            if (sortBy) {
                sortBy.addEventListener('change', (e) => {
                    this.filters.sort = e.target.value;
                    this.loadStories();
                });
            }

            if (clearSearch) {
                clearSearch.addEventListener('click', () => {
                    if (searchInput) searchInput.value = '';
                    this.filters.search = '';
                    this.loadStories();
                });
            }
        }

        setupModal() {
            const modalClose = document.getElementById('modal-close');
            const modal = document.getElementById('story-modal');

            if (modalClose && modal) {
                modalClose.addEventListener('click', () => {
                    modal.style.display = 'none';
                });

                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.style.display = 'none';
                    }
                });

                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && modal.style.display === 'flex') {
                        modal.style.display = 'none';
                    }
                });
            }
        }

        validateStoryLength(textarea) {
            const minLength = 50;
            const currentLength = textarea.value.length;
            const charCount = document.getElementById('char-count');
            const submitButton = document.querySelector('#story-form button[type="submit"]');

            if (charCount) {
                charCount.textContent = currentLength;
                charCount.style.color = currentLength < minLength ? '#dc3545' : '#28a745';
            }

            if (currentLength < minLength) {
                textarea.style.borderColor = '#dc3545';
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.style.opacity = '0.6';
                }
            } else {
                textarea.style.borderColor = '#28a745';
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.style.opacity = '1';
                }
            }
        }

        validateStory(storyData) {
            if (!storyData.name || storyData.name.trim().length < 2) {
                this.showAlert('Por favor, ingresa tu nombre completo.', 'error');
                return false;
            }

            if (!storyData.email || !this.isValidEmail(storyData.email)) {
                this.showAlert('Por favor, ingresa un correo electrónico válido.', 'error');
                return false;
            }

            if (!storyData.storyType) {
                this.showAlert('Por favor, selecciona el tipo de historia.', 'error');
                return false;
            }

            if (storyData.story.length < 50) {
                this.showAlert('Por favor, escribe una historia más detallada (mínimo 50 caracteres).', 'error');
                return false;
            }

            if (!storyData.share) {
                this.showAlert('Por favor, indica si permites compartir tu historia.', 'error');
                return false;
            }

            return true;
        }

        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }

        getStoryTypeLabel(type) {
            const types = {
                'memory': '📖 Recuerdo personal',
                'family': '👨‍👩‍👧‍👦 Historia familiar',
                'work': '💼 Experiencia laboral',
                'cultural': '🎭 Vivencia cultural',
                'tradition': '🏺 Tradición o costumbre',
                'other': '📌 Otra experiencia'
            };
            return types[type] || '📌 Historia';
        }

        formatDate(dateString) {
            if (!dateString) return 'Fecha no disponible';
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } catch (e) {
                return dateString;
            }
        }

        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        truncateText(text, maxLength) {
            if (!text) return '';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        }

        showLoading(show) {
            const gallery = document.getElementById('stories-gallery');
            if (!gallery) return;

            if (show) {
                gallery.innerHTML = `
                    <div class="no-stories">
                        <i class="fas fa-spinner fa-spin" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <p>Cargando historias...</p>
                    </div>
                `;
            }
        }

        showAlert(message, type) {
            let alertContainer = document.getElementById('alert-container');
            if (!alertContainer) {
                alertContainer = document.createElement('div');
                alertContainer.id = 'alert-container';
                alertContainer.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                `;
                document.body.appendChild(alertContainer);
            }

            const alert = document.createElement('div');
            alert.style.cssText = `
                padding: 15px 20px;
                margin-bottom: 10px;
                border-radius: 5px;
                color: white;
                font-weight: bold;
                max-width: 300px;
                animation: slideIn 0.3s ease;
            `;

            if (type === 'success') {
                alert.style.background = '#28a745';
            } else {
                alert.style.background = '#dc3545';
            }

            alert.textContent = message;
            alertContainer.appendChild(alert);

            setTimeout(() => {
                alert.remove();
            }, 5000);
        }
    }

    // Inicializar el sistema de historias
    window.storyManager = new MySQLStoryManager();
    console.log('✅ Sistema de historias inicializado correctamente');
});
