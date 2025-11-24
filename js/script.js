// js/script.js

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. CONTAGEM REGRESSIVA (FORMATO FAIXA)
    const countdownElements = document.querySelectorAll('.countdown-target');
    
    if (countdownElements.length > 0) {
        function initializeCountdown() {
            const updateCountdown = () => {
                const now = new Date();
                const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                const distance = endOfDay.getTime() - now.getTime();

                let displayText = "00:00:00";

                if (distance > 0) {
                    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                    displayText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                } else {
                    displayText = "EXPIRADO";
                }

                countdownElements.forEach(el => {
                    el.textContent = displayText;
                });
            };
            updateCountdown();
            setInterval(updateCountdown, 1000);
        }
        initializeCountdown();
    }

    // 2. ANIMAÇÃO DE REVEAL
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));
    
    // 3. CONTROLE DE VOLUME VÍDEO
    const video = document.getElementById('meuVideo');
    const botaoVolume = document.getElementById('botaoVolume');
    const iconeVolume = document.getElementById('iconeVolume');

    if (botaoVolume && video && iconeVolume) {
        botaoVolume.addEventListener('click', () => {
            if (video.muted) {
                video.muted = false;
                iconeVolume.classList.remove('fa-volume-mute');
                iconeVolume.classList.add('fa-volume-up');
            } else {
                video.muted = true;
                iconeVolume.classList.remove('fa-volume-up');
                iconeVolume.classList.add('fa-volume-mute');
            }
        });
    }

    // 4. CONTROLE DO STICKY FOOTER (ESCONDER NO PLANO)
    const stickyFooter = document.getElementById('stickyFooter');
    const pricingSection = document.getElementById('planos');

    if (stickyFooter && pricingSection) {
        const stickyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    stickyFooter.classList.add('translate-y-[200%]', 'opacity-0');
                    stickyFooter.classList.remove('animate-pulse-slow'); 
                } else {
                    stickyFooter.classList.remove('translate-y-[200%]', 'opacity-0');
                }
            });
        }, { threshold: 0.1 });

        stickyObserver.observe(pricingSection);
    }
    // 5. PERSONALIZAÇÃO DINÂMICA (HEADLINE VIA URL)
    // Verifica se veio do Chat (parametro ?source=chat_sabotador)
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('source') === 'chat_sabotador') {
        const heroTitle = document.querySelector('header h1');
        const heroSub = document.querySelector('header p'); // O texto pequeno abaixo do título
        
        if (heroTitle) {
            // Altera o Título mantendo o design "Brutal Red"
            heroTitle.innerHTML = `
                Seu Dossiê está <br>
                <span class="text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-800 text-glow">Pronto.</span>
            `;
        }

        if (heroSub) {
            // Altera o subtítulo para conectar com a promessa do sabotador
            heroSub.innerHTML = `
                Descubra agora qual <strong>Sabotador</strong> sequestrou sua mente.
            `;
        }
    }
});