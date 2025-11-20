// js/script.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. CONTAGEM REGRESSIVA ATÉ A MEIA-NOITE (URGÊNCIA REAL) ---
    const countdownElement = document.getElementById('countdown');
    
    if (countdownElement) {
        function initializeCountdown() {
            const updateCountdown = () => {
                const now = new Date();
                // Alvo: 23:59:59 de HOJE
                const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                
                const distance = endOfDay.getTime() - now.getTime();

                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                if (distance < 0) {
                     // Se virou o dia, mostra "00:00:00" ou reinicia
                     countdownElement.innerHTML = `<span class="text-2xl text-gray-500">Oferta Expirada</span>`;
                } else {
                    countdownElement.innerHTML = `
                        <div class="flex flex-col items-center"><span class="text-4xl md:text-5xl font-black">${String(hours).padStart(2, '0')}</span><span class="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest">Horas</span></div>
                        <span class="text-2xl md:text-4xl text-gray-600 mx-2 mt-2">:</span>
                        <div class="flex flex-col items-center"><span class="text-4xl md:text-5xl font-black">${String(minutes).padStart(2, '0')}</span><span class="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest">Min</span></div>
                        <span class="text-2xl md:text-4xl text-gray-600 mx-2 mt-2">:</span>
                        <div class="flex flex-col items-center"><span class="text-4xl md:text-5xl font-black">${String(seconds).padStart(2, '0')}</span><span class="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest">Seg</span></div>
                    `;
                }
            };
            updateCountdown();
            setInterval(updateCountdown, 1000);
        }
        initializeCountdown();
    }

    // --- 2. ANIMAÇÃO DE REVEAL (APARECER AO ROLAR) ---
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

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
    
    // --- 3. CONTROLE DE VOLUME DO VÍDEO ---
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

});