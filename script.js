// script.js - VERSIÓN CORREGIDA
// Sistema completo de gestión de historias con MySQL

document.addEventListener('DOMContentLoaded', () => {
    // [TUS FUNCIONES EXISTENTES DE NAVEGACIÓN Y SLIDER...]
    // Mantén todo tu código existente de navegación, tabs, slider, etc.

    /* ---------------------------------- */
    /* Sistema de Gestión de Historias    */
    /* con MySQL Backend - VERSIÓN CORREGIDA */
    /* ---------------------------------- */
    class MySQLStoryManager {
        constructor() {
            // ✅ URL CORRECTA DE TU API
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

        // Cargar historias desde MySQL - CORREGIDO
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
                
                // ✅ CORREGIDO: Manejar la estructura correcta de respuesta
                if (data.status === 'success' && Array.isArray(data.data)) {
                    this.currentStories = data.data;
                } else if (data.error) {
                    throw new Error(data.error);
                } else {
                    this.currentStories = [];
                }
                
                this.displayStories(this.currentStories);
                this.updateStats();
                
            } catch (error) {
                console.error('❌ Error al cargar historias:', error);
                this.showAlert(`Error al cargar las historias: ${error.message}`, 'error');
                this.currentStories = [];
                this.displayStories([]);
            } finally {
                this.showLoading(false);
            }
        }

        // Guardar historia en MySQL - CORREGIDO
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

        // ✅ NUEVO: Función para obtener el valor del campo share
        getShareValue() {
            const shareYes = document.getElementById('share-yes');
            const shareNo = document.getElementById('share-no');
            
            if (shareYes && shareYes.checked) return 'yes';
            if (shareNo && shareNo.checked) return 'no';
            return 'no'; // valor por defecto
        }

        // Manejar el envío del formulario - CORREGIDO
        async handleFormSubmit(form) {
            // ✅ CORREGIDO: Obtener datos correctamente
            const storyData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                location: document.getElementById('location').value.trim(),
                storyType: document.getElementById('story-type').value, // ✅ Mantener storyType (el backend lo espera así)
                story: document.getElementById('story').value.trim(),
                share: this.getShareValue() // ✅ CORREGIDO: Obtener valor del radio button
            };

            console.log('📝 Datos del formulario:', storyData);

            // Validación
            if (!this.validateStory(storyData)) {
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            try {
                // Mostrar loading
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
                submitBtn.disabled = true;

                // Guardar en MySQL
                const result = await this.saveStory(storyData);

                // ✅ CORREGIDO: Verificar respuesta del servidor
                if (result.status === 'success') {
                    this.showAlert('¡Gracias por compartir tu historia! Tu testimonio ha sido guardado correctamente.', 'success');
                    
                    // Recargar la galería
                    await this.loadStories();

                    // Reiniciar formulario
                    form.reset();
                    this.validateStoryLength(document.getElementById('story'));
                    
                    // ✅ Opcional: Cambiar a la pestaña de historias
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
                // Restaurar botón
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }

        // Configurar el manejo del formulario - CORREGIDO
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

            // Validación en tiempo real
            const storyTextarea = document.getElementById('story');
            if (storyTextarea) {
                storyTextarea.addEventListener('input', (e) => {
                    this.validateStoryLength(e.target);
                });
                this.validateStoryLength(storyTextarea);
            }

            // ✅ Asegurar que los radio buttons estén configurados
            const shareYes = document.getElementById('share-yes');
            const shareNo = document.getElementById('share-no');
            if (shareYes && shareNo) {
                shareYes.checked = true; // Valor por defecto
            }
        }

        // Mostrar historias en la galería - CORREGIDO
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

            // ✅ CORREGIDO: Usar los nombres de campos correctos del backend
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

        // ✅ NUEVA FUNCIÓN: Formatear fecha
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

        // [MANTÉN EL RESTO DE TUS FUNCIONES EXISTENTES...]
        // setupFilters, setupModal, validateStory, showAlert, etc.
        // Todas estas funciones pueden permanecer igual

        // Validar los datos de la historia - CORREGIDO
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

        // [EL RESTO DE TUS MÉTODOS PERMANECEN IGUAL...]
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
            // Buscar contenedor de alertas o crear uno temporal
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
