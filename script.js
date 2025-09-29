// script.js
// Sistema completo de gestión de historias y navegación

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

    // Mostrar la pestaña activa al cargar la página (en caso de que alguna no esté activa)
    const initialActive = document.querySelector('.tab-link.active');
    if (initialActive) {
        showTab(initialActive.getAttribute('data-target'));
    }

    // Restaurar pestaña activa desde localStorage
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab) {
        showTab(savedTab);
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
    /* ---------------------------------- */
    class StoryManager {
        constructor() {
            this.storageKey = 'cottonStories';
            this.currentStories = [];
            this.filters = {
                search: '',
                type: '',
                sort: 'newest'
            };
            this.init();
        }

        init() {
            this.loadStories();
            this.setupFormHandler();
            this.setupFilters();
            this.setupModal();
            this.updateStats();
        }

        // Cargar historias desde localStorage
        loadStories() {
            this.currentStories = this.getStories();
            this.applyFilters();
        }

        // Obtener todas las historias
        getStories() {
            return JSON.parse(localStorage.getItem(this.storageKey)) || [];
        }

        // Guardar una nueva historia
        saveStory(storyData) {
            const stories = this.getStories();
            const newStory = {
                ...storyData,
                id: Date.now(),
                date: new Date().toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                timestamp: Date.now()
            };
            
            stories.push(newStory);
            localStorage.setItem(this.storageKey, JSON.stringify(stories));
            
            return newStory;
        }

        // Eliminar una historia
        deleteStory(storyId) {
            if (confirm('¿Estás seguro de que quieres eliminar esta historia?')) {
                const stories = this.getStories().filter(story => story.id !== storyId);
                localStorage.setItem(this.storageKey, JSON.stringify(stories));
                this.loadStories();
                this.showAlert('Historia eliminada correctamente', 'success');
            }
        }

        // Aplicar filtros y búsqueda
        applyFilters() {
            let filteredStories = this.getStories().filter(story => story.share === 'yes');

            // Filtro por búsqueda
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                filteredStories = filteredStories.filter(story => 
                    story.name.toLowerCase().includes(searchTerm) ||
                    story.story.toLowerCase().includes(searchTerm) ||
                    (story.location && story.location.toLowerCase().includes(searchTerm))
                );
            }

            // Filtro por tipo
            if (this.filters.type) {
                filteredStories = filteredStories.filter(story => story.storyType === this.filters.type);
            }

            // Ordenar
            switch (this.filters.sort) {
                case 'oldest':
                    filteredStories.sort((a, b) => a.timestamp - b.timestamp);
                    break;
                case 'name':
                    filteredStories.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'newest':
                default:
                    filteredStories.sort((a, b) => b.timestamp - a.timestamp);
            }

            this.displayStories(filteredStories);
            this.updateStats();
        }

        // Mostrar historias en la galería
        displayStories(stories) {
            const gallery = document.getElementById('stories-gallery');
            
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
                        <button class="btn btn-danger" onclick="storyManager.deleteStory(${story.id})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `).join('');
        }

        // Ver historia completa en modal
        viewStory(storyId) {
            const story = this.getStories().find(s => s.id === storyId);
            if (!story) return;

            const modalContent = document.getElementById('modal-content');
            modalContent.innerHTML = `
                <h3>Historia de ${this.escapeHtml(story.name)}</h3>
                <div class="story-type">${this.getStoryTypeLabel(story.storyType)}</div>
                ${story.location ? `
                    <div class="story-location">
                        <i class="fas fa-map-marker-alt"></i> 
                        ${this.escapeHtml(story.location)}
                    </div>
                ` : ''}
                <div class="story-date">Publicado el ${story.date}</div>
                <div class="story-content" style="margin-top: 1rem; white-space: pre-line;">
                    ${this.escapeHtml(story.story)}
                </div>
                ${story.email ? `
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee;">
                        <strong>Contacto:</strong> ${this.escapeHtml(story.email)}
                    </div>
                ` : ''}
            `;

            document.getElementById('story-modal').style.display = 'flex';
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

        // Manejar el envío del formulario
        handleFormSubmit(form) {
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

            // Guardar la historia
            this.saveStory(storyData);

            // Mostrar mensaje de éxito
            this.showAlert('¡Gracias por compartir tu historia! Tu testimonio ha sido guardado correctamente.', 'success');

            // Recargar la galería
            this.loadStories();

            // Reiniciar formulario
            form.reset();
            this.validateStoryLength(document.getElementById('story'));
        }

        // Configurar filtros
        setupFilters() {
            const searchInput = document.getElementById('search-stories');
            const filterType = document.getElementById('filter-type');
            const sortBy = document.getElementById('sort-by');
            const clearSearch = document.getElementById('clear-search');

            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filters.search = e.target.value;
                    this.applyFilters();
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

            if (modalClose) {
                modalClose.addEventListener('click', () => {
                    if (modal) modal.style.display = 'none';
                });
            }

            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.style.display = 'none';
                    }
                });
            }
        }

        // Actualizar estadísticas
        updateStats() {
            const stories = this.getStories();
            const publicStories = stories.filter(story => story.share === 'yes');
            const thisMonth = new Date().getMonth();
            const thisYear = new Date().getFullYear();
            
            const storiesThisMonth = stories.filter(story => {
                const storyDate = new Date(story.timestamp);
                return storyDate.getMonth() === thisMonth && 
                       storyDate.getFullYear() === thisYear;
            });

            const totalStories = document.getElementById('total-stories');
            const publicStoriesEl = document.getElementById('public-stories');
            const storiesThisMonthEl = document.getElementById('stories-this-month');

            if (totalStories) totalStories.textContent = stories.length;
            if (publicStoriesEl) publicStoriesEl.textContent = publicStories.length;
            if (storiesThisMonthEl) storiesThisMonthEl.textContent = storiesThisMonth.length;
        }

        // Mostrar alertas
        showAlert(message, type) {
            const alert = document.getElementById(`alert-${type}`);
            if (!alert) return;

            alert.textContent = message;
            alert.style.display = 'block';
            
            setTimeout(() => {
                alert.style.display = 'none';
            }, 5000);
        }

        // Validar los datos de la historia
        validateStory(storyData) {
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
    window.storyManager = new StoryManager();

    // Inicializar validación de longitud del texto
    const storyTextarea = document.getElementById('story');
    if (storyTextarea) {
        storyTextarea.addEventListener('input', function() {
            window.storyManager.validateStoryLength(this);
        });
        // Validar inicialmente
        window.storyManager.validateStoryLength(storyTextarea);
    }
});
