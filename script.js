// script.js
// Maneja la navegación entre pestañas. Cada botón tiene un atributo
// data-target que coincide con el id de la sección a mostrar.

document.addEventListener('DOMContentLoaded', () => {
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
});