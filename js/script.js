// js/script.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA ORIGINAL DO CONTADOR (MANTIDA) ---
    const countdownElement = document.getElementById('countdown');
    
    if (countdownElement) {
        function initializeCountdown() {
    const countdownElement = document.getElementById('countdown');
    
    const updateCountdown = () => {
        const now = new Date();
        // Define o alvo para as 23:59:59 de HOJE
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        
        const distance = endOfDay.getTime() - now.getTime();

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        countdownElement.innerHTML = `
            <div class="flex flex-col items-center"><span class="text-4xl md:text-5xl font-black">${String(hours).padStart(2, '0')}</span><span class="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest">Horas</span></div>
            <span class="text-2xl md:text-4xl text-gray-600 mx-2 mt-2">:</span>
            <div class="flex flex-col items-center"><span class="text-4xl md:text-5xl font-black">${String(minutes).padStart(2, '0')}</span><span class="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest">Min</span></div>
            <span class="text-2xl md:text-4xl text-gray-600 mx-2 mt-2">:</span>
            <div class="flex flex-col items-center"><span class="text-4xl md:text-5xl font-black">${String(seconds).padStart(2, '0')}</span><span class="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest">Seg</span></div>
        `;
    };

    updateCountdown();
    setInterval(updateCountdown, 1000);
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