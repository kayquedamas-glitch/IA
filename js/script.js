// js/script.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA ORIGINAL DO CONTADOR (MANTIDA) ---
    const countdownElement = document.getElementById('countdown');
    
    if (countdownElement) {
        function initializeCountdown() {
            const now = new Date();
            let expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); 
            const offset = expiry.getTime() % (24 * 60 * 60 * 1000);  
            expiry.setTime(expiry.getTime() - offset);
            expiry = new Date(expiry.getTime() + 24 * 60 * 60 * 1000);

            const updateCountdown = () => {
                const now = new Date().getTime();
                const distance = expiry.getTime() - now;

                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                if (distance < 0) {
                    clearInterval(interval);
                    countdownElement.innerHTML = `<span class="text-2xl">OFERTA EXPIRADA</span>`;
                } else {
                    countdownElement.innerHTML = `
                        <div class="flex flex-col items-center"><span>${String(hours).padStart(2, '0')}</span><span class="text-base font-normal uppercase">Horas</span></div>
                        :
                        <div class="flex flex-col items-center"><span>${String(minutes).padStart(2, '0')}</span><span class="text-base font-normal uppercase">Minutos</span></div>
                        :
                        <div class="flex flex-col items-center"><span>${String(seconds).padStart(2, '0')}</span><span class="text-base font-normal uppercase">Segundos</span></div>
                    `;
                }
            };
            updateCountdown();
            const interval = setInterval(updateCountdown, 1000);
        }
        initializeCountdown();
    }
    // --- NOVA LÓGICA DE ANIMAÇÃO (OBSERVER) ---
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1 // Dispara assim que 10% do elemento aparece
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Garante que anima só uma vez
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));
    
});
// js/script.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA ORIGINAL DO CONTADOR (MANTIDA) ---
    // (Seu código do contador está aqui)
    // ...
    // ...
    
    // --- NOVA LÓGICA DE ANIMAÇÃO (OBSERVER) ---
    // (Seu código do observer 'reveal' está aqui)
    // ...
    // ...

    // ===============================================
    //           NOVO CÓDIGO DO BOTÃO DE VÍDEO
    // ===============================================
    // (O código do botão de vídeo deve estar AQUI,
    //  antes do '});' final)
    
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

}); // <-- ESTA DEVE SER A ÚLTIMA LINHA DO ARQUIVO.
    // O código do botão deve estar ACIMA dela.