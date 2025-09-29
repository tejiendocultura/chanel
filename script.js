// script.js
// Sistema completo de gestión de historias con MySQL

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
        // Desplazar la ventana al inicio del contenido para mejorar la experiencia
        // Evitar desplazar en la primera carga (cuando se muestra la pestaña inicial)
        if (!initialLoad) {
            window.scrollTo({ top: document.querySelector('nav.tabs').offsetTop, behavior: 'smooth' });
        } else {
            initialLoad = false;
        }

        // Guardar la pestaña activa en localStorage
        localStorage.setItem('activeTab', targetId);

        // Si es la pestaña de historias, cargar las historias
        if (targetId === 'tu-historia') {
            storyManager.loadStories();
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

    /* ---------------------- */
    /* Slider del encabezado  */
    /* ---------------------- */
    const slides = document.querySelectorAll('#heroSlider img');
    let currentSlide = 0;
    if (slides.length > 0) {
        // Asegurarse de que sólo la primera imagen esté visible
        slides.forEach((img, idx) => {
            if (idx === 0) {
                img.classList.add('active');
            } else {
                img.classList.remove('active');
            }
        });
        setInterval(() => {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 5000); // cambiar cada 5 segundos
    }

    /* ---------------------------------------------- */
    /* Animación de aparición para la línea de tiempo */
    /* ---------------------------------------------- */
    const timelineEvents = document.querySelectorAll('.timeline-event');
    const observerOptions = {
        threshold: 0.3
    };
    const timelineObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const image = entry.target.querySelector('.timeline-image');
                if (image) {
                    image.classList.remove('hidden');
                    image.classList.add('visible');
                }
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    timelineEvents.forEach(event => {
        timelineObserver.observe(event);
    });

    /* ---------------------------------- */
    /* Sistema de Gestión de Historias    */
    /* con MySQL Backend                  */
    /* ---------------------------------- */
    class MySQLStoryManager {
        constructor() {
            // CAMBIA ESTA URL POR LA DE TU API
            this.apiUrl = 'https://piratafivor.com/tejiendocultura/api.php';
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
            this.updateStats();
        }

        // Cargar historias desde MySQL
        async loadStories() {
            try {
                this.showLoading(true);
                
                const params = new URLSearchParams();
                if (this.filters.search) params.append('search', this.filters.search);
                if (this.filters.type) params.append('type', this.filters.type);
                if (this.filters.sort) params.append('sort', this.filters.sort);

                const response = await fetch(`${this.apiUrl}?${params}`);
                
                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                // Manejar tanto array como objeto con error
                if (Array.isArray(data)) {
                    this.currentStories = data;
                } else if (data.error) {
                    throw new Error(data.error);
                } else {
                    this.currentStories = [];
                }
                
                this.displayStories(this.currentStories);
                this.updateStats();
                
            } catch (error) {
                console.error('Error al cargar historias:', error);
                this.showAlert(`Error al cargar las historias: ${error.message}`, 'error');
                this.currentStories = [];
                this.displayStories([]);
            } finally {
                this.showLoading(false);
            }
        }

        // Guardar historia en MySQL
        async saveStory(storyData) {
            try {
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(storyData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Error ${response.status}`);
                }

                const savedStory = await response.json();
                return savedStory;
                
            } catch (error) {
                console.error('Error al guardar:', error);
                throw new Error(`No se pudo guardar la historia: ${error.message}`);
            }
        }

        // Eliminar historia
        async deleteStory(storyId) {
            if (!confirm('¿Estás seguro de que quieres eliminar esta historia?')) {
                return;
            }

            try {
                const response = await fetch(this.apiUrl, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ id: storyId })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error al eliminar');
                }

                await this.loadStories();
                this.showAlert('Historia eliminada correctamente', 'success');
                
            } catch (error) {
                console.error('Error al eliminar:', error);
                this.showAlert(`Error al eliminar la historia: ${error.message}`, 'error');
            }
        }

        // Aplicar filtros (recarga desde el servidor)
        applyFilters() {
            this.loadStories();
        }

        // Mostrar/ocultar loading
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

        // Mostrar historias en la galería
        displayStories(stories) {
            const gallery = document.getElementById('stories-gallery');
            if (!gallery) return;
            
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
                        <div class="story-date">${story.date}</div>
                    </div>
                    <div class="story-type">${this.getStoryTypeLabel(story.story_type)}</div>
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
                        <button class="btn btn-danger" onclick="storyManager.deleteStory(${story.id})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `).join('');
        }

        // Ver historia completa en modal
        viewStory(storyId) {
            const story = this.currentStories.find(s => s.id == storyId);
            if (!story) return;

            const modalContent = document.getElementById('modal-content');
            const modal = document.getElementById('story-modal');
            
            if (!modalContent || !modal) return;

            modalContent.innerHTML = `
                <h3>Historia de ${this.escapeHtml(story.name)}</h3>
                <div class="story-type">${this.getStoryTypeLabel(story.story_type)}</div>
                ${story.location ? `
                    <div class="story-location">
                        <i class="fas fa-map-marker-alt"></i> 
                        ${this.escapeHtml(story.location)}
                    </div>
                ` : ''}
                <div class="story-date">Publicado el ${story.date}</div>
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

        // Manejar el envío del formulario
        async handleFormSubmit(form) {
            const formData = new FormData(form);
            const storyData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                location: document.getElementById('location').value.trim(),
                storyType: document.getElementById('story-type').value,
                story: document.getElementById('story').value.trim(),
                share: formData.get('share')
            };

            // Validación
            if (!this.validateStory(storyData)) {
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            const originalDisabled = submitBtn.disabled;

            try {
                // Mostrar loading
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
                submitBtn.disabled = true;

                // Guardar en MySQL
                await this.saveStory(storyData);

                // Mostrar mensaje de éxito
                this.showAlert('¡Gracias por compartir tu historia! Tu testimonio ha sido guardado correctamente.', 'success');

                // Recargar la galería
                await this.loadStories();

                // Reiniciar formulario
                form.reset();
                this.validateStoryLength(document.getElementById('story'));

            } catch (error) {
                console.error('Error en submit:', error);
                this.showAlert(error.message || 'Error al guardar la historia. Intenta nuevamente.', 'error');
            } finally {
                // Restaurar botón
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = originalDisabled;
            }
        }

        // Configurar el manejo del formulario
        setupFormHandler() {
            const form = document.getElementById('story-form');
            if (!form) return;

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(form);
            });

            // Validación en tiempo real
            const storyTextarea = document.getElementById('story');
            if (storyTextarea) {
                storyTextarea.addEventListener('input', (e) => {
                    this.validateStoryLength(e.target);
                });
                // Validar inicialmente
                this.validateStoryLength(storyTextarea);
            }
        }

        // Validar longitud de la historia
        validateStoryLength(textarea) {
            const minLength = 50;
            const currentLength = textarea.value.length;
            const charCount = document.getElementById('char-count');
            const submitButton = document.querySelector('#story-form button[type="submit"]');

            if (charCount) {
                charCount.textContent = currentLength;
                charCount.style.color = currentLength < minLength ? 'var(--danger-color)' : 'var(--success-color)';
            }

            if (currentLength < minLength) {
                textarea.style.borderColor = 'var(--danger-color)';
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.style.opacity = '0.6';
                }
            } else {
                textarea.style.borderColor = 'var(--success-color)';
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.style.opacity = '1';
                }
            }
        }

        // Configurar filtros
        setupFilters() {
            const searchInput = document.getElementById('search-stories');
            const filterType = document.getElementById('filter-type');
            const sortBy = document.getElementById('sort-by');
            const clearSearch = document.getElementById('clear-search');

            // Búsqueda con debounce para mejor performance
            let searchTimeout;
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.filters.search = e.target.value;
                        this.applyFilters();
                    }, 300);
                });
            }

            if (filterType) {
                filterType.addEventListener('change', (e) => {
                    this.filters.type = e.target.value;
                    this.applyFilters();
                });
            }

            if (sortBy) {
                sortBy.addEventListener('change', (e) => {
                    this.filters.sort = e.target.value;
                    this.applyFilters();
                });
            }

            if (clearSearch) {
                clearSearch.addEventListener('click', () => {
                    if (searchInput) searchInput.value = '';
                    this.filters.search = '';
                    this.applyFilters();
                });
            }
        }

        // Configurar modal
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

                // Cerrar con ESC
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && modal.style.display === 'flex') {
                        modal.style.display = 'none';
                    }
                });
            }
        }

        // Actualizar estadísticas
        updateStats() {
            const publicStories = this.currentStories.filter(story => story.share === 'yes');
            const thisMonth = new Date().getMonth();
            const thisYear = new Date().getFullYear();
            
            const storiesThisMonth = this.currentStories.filter(story => {
                const storyDate = new Date(story.timestamp * 1000);
                return storyDate.getMonth() === thisMonth && 
                       storyDate.getFullYear() === thisYear;
            });

            const totalStories = document.getElementById('total-stories');
            const publicStoriesEl = document.getElementById('public-stories');
            const storiesThisMonthEl = document.getElementById('stories-this-month');

            if (totalStories) totalStories.textContent = this.currentStories.length;
            if (publicStoriesEl) publicStoriesEl.textContent = publicStories.length;
            if (storiesThisMonthEl) storiesThisMonthEl.textContent = storiesThisMonth.length;
        }

        // Mostrar alertas
        showAlert(message, type) {
            const alert = document.getElementById(`alert-${type}`);
            if (!alert) {
                console.log(`Alert ${type}: ${message}`);
                return;
            }

            alert.textContent = message;
            alert.style.display = 'block';
            
            // Auto-ocultar después de 5 segundos
            setTimeout(() => {
                alert.style.display = 'none';
            }, 5000);
        }

        // Validar los datos de la historia
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

        // Validar email
        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }

        // Obtener etiqueta para el tipo de historia
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

        // Escapar HTML para seguridad
        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Truncar texto
        truncateText(text, maxLength) {
            if (!text) return '';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        }
    }

    // Inicializar el sistema de historias
    window.storyManager = new MySQLStoryManager();

    // Debug: para probar desde la consola
    console.log('Sistema de historias inicializado. Usa window.storyManager para acceder.');
});

// Utilidades globales para manejo de errores
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rechazada:', event.reason);
});
