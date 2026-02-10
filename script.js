document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('imageInput');
    const compressionTypeInputs = document.querySelectorAll('input[name="compressionType"]');
    const qualitySlider = document.getElementById('qualitySlider');
    const qualityValue = document.getElementById('qualityValue');
    const qualitySection = document.getElementById('qualitySection');
    const compressBtn = document.getElementById('compressBtn');
    const results = document.getElementById('results');
    const originalImage = document.getElementById('originalImage');
    const compressedImage = document.getElementById('compressedImage');
    const originalSize = document.getElementById('originalSize');
    const compressedSize = document.getElementById('compressedSize');
    const downloadLink = document.getElementById('downloadLink');
    const progressSection = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressBar');
    const dropZone = document.getElementById('dropZone');
    const batchInput = document.getElementById('batchInput');
    const batchFiles = document.getElementById('batchFiles');
    const fileList = document.getElementById('fileList');

    let originalFile = null;

    // Handle compression type change
    compressionTypeInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.value === 'lossy') {
                qualitySection.style.display = 'block';
            } else {
                qualitySection.style.display = 'none';
            }
        });
    });

    // Update quality value display
    qualitySlider.addEventListener('input', function() {
        qualityValue.textContent = this.value;
    });

    // Handle file input
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            originalFile = file;
            batchFilesArray = []; // Reset batch files
            batchFiles.style.display = 'none';
            const reader = new FileReader();
            reader.onload = function(e) {
                originalImage.src = e.target.result;
                // Update size display with clear formatting
                const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
                document.getElementById('originalSizeValue').textContent = originalSizeMB + ' MB';
            };
            reader.readAsDataURL(file);
        }
    });

    // Handle batch input
    batchInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            batchFilesArray = files;
            originalFile = null; // Reset single file
            updateBatchFileList();
            batchFiles.style.display = 'block';
        }
    });

    // Drag and drop functionality
    dropZone.addEventListener('click', function() {
        batchInput.click();
    });

    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        if (files.length > 0) {
            batchFilesArray = files;
            originalFile = null; // Reset single file
            updateBatchFileList();
            batchFiles.style.display = 'block';
        }
    });

    function updateBatchFileList() {
        fileList.innerHTML = '';
        batchFilesArray.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)} MB
                <button class="btn btn-sm btn-outline-danger" onclick="removeFile(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            `;
            fileList.appendChild(li);
        });
    }

    window.removeFile = function(index) {
        batchFilesArray.splice(index, 1);
        updateBatchFileList();
        if (batchFilesArray.length === 0) {
            batchFiles.style.display = 'none';
        }
    };

    // Handle compression
    compressBtn.addEventListener('click', async function() {
        if (!originalFile && batchFilesArray.length === 0) {
            showToast('يرجى اختيار صورة أو رفع صور متعددة أولاً.', 'danger');
            return;
        }

        const compressionType = document.querySelector('input[name="compressionType"]:checked').value;
        const quality = parseInt(qualitySlider.value) / 100;

        // Get advanced options
        const maxWidth = parseInt(document.getElementById('maxWidth').value) || 1920;
        const maxHeight = parseInt(document.getElementById('maxHeight').value) || 1080;
        const outputFormat = document.getElementById('outputFormat').value;
        const preserveExif = document.getElementById('preserveExif').checked;

        progressSection.style.display = 'block';
        progressBar.style.width = '0%';
        compressBtn.disabled = true;
        compressBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> جاري الضغط...';

        try {
            let options = {
                maxSizeMB: 1,
                maxWidthOrHeight: Math.max(maxWidth, maxHeight),
                useWebWorker: true,
                preserveExif: preserveExif,
                onProgress: (progress) => {
                    progressBar.style.width = `${progress}%`;
                }
            };

            if (compressionType === 'lossless') {
                options.fileType = outputFormat === 'auto' ? 'image/png' : `image/${outputFormat}`;
                options.initialQuality = 1;
            } else if (compressionType === 'lossy') {
                options.fileType = outputFormat === 'auto' ? 'image/jpeg' : `image/${outputFormat}`;
                options.initialQuality = quality;
            } else if (compressionType === 'hybrid') {
                options.fileType = outputFormat === 'auto' ? 'image/webp' : `image/${outputFormat}`;
                options.initialQuality = 0.8;
            }

            if (originalFile) {
                // Single file compression
                const compressedFile = await imageCompression(originalFile, options);

                const compressedReader = new FileReader();
                compressedReader.onload = function(e) {
                    compressedImage.src = e.target.result;
                    compressedSize.textContent = `الحجم: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`;
                    downloadLink.href = e.target.result;
                    downloadLink.download = `compressed_${originalFile.name.split('.')[0]}.${compressedFile.name.split('.').pop()}`;
                    results.style.display = 'flex';
                    results.classList.add('fade-in');

                    // Update compression stats
                    updateCompressionStats(originalFile.size, compressedFile.size);
                };
                compressedReader.readAsDataURL(compressedFile);
                showToast('تم ضغط الصورة بنجاح!', 'success');
            } else {
                // Batch compression
                const compressedFiles = [];
                for (let i = 0; i < batchFilesArray.length; i++) {
                    const file = batchFilesArray[i];
                    const compressedFile = await imageCompression(file, options);
                    compressedFiles.push(compressedFile);
                    progressBar.style.width = `${((i + 1) / batchFilesArray.length) * 100}%`;
                }

                // Create ZIP download for batch
                const zip = new JSZip();
                compressedFiles.forEach((file, index) => {
                    zip.file(`compressed_${batchFilesArray[index].name}`, file);
                });
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                downloadLink.href = URL.createObjectURL(zipBlob);
                downloadLink.download = 'compressed_images.zip';
                downloadLink.style.display = 'inline-block';
                showToast(`تم ضغط ${compressedFiles.length} صورة بنجاح!`, 'success');
            }

        } catch (error) {
            console.error('Error compressing image:', error);
            showToast('حدث خطأ أثناء ضغط الصورة. يرجى المحاولة مرة أخرى.', 'danger');
        } finally {
            progressSection.style.display = 'none';
            compressBtn.disabled = false;
            compressBtn.innerHTML = '<i class="bi bi-compress"></i> ضغط الصورة';
        }
    });

    function showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        document.body.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
});

// Advanced Features Implementation

// Initialize smooth animations
function initializeAnimations() {
    // Add fade-in animations to elements
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, observerOptions);

    // Observe all animate-on-scroll elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });

    // Add loading animations
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!this.classList.contains('loading')) {
                this.classList.add('loading');
                setTimeout(() => {
                    this.classList.remove('loading');
                }, 2000);
            }
        });
    });
}

// Initialize scroll effects
function initializeScrollEffects() {
    let lastScrollTop = 0;

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Navbar scroll effect
        const navbar = document.querySelector('.navbar');
        if (scrollTop > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Parallax effect for hero section
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            const scrolled = scrollTop * 0.5;
            heroSection.style.transform = `translateY(${scrolled}px)`;
        }

        lastScrollTop = scrollTop;
    });
}

// Initialize form interactions
function initializeFormInteractions() {
    // Enhanced form focus effects
    document.querySelectorAll('.form-control, .form-select').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });

        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
    });

    // Card option selection effects
    document.querySelectorAll('.card-option').forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from siblings
            this.parentElement.querySelectorAll('.card-option').forEach(opt => {
                opt.classList.remove('active');
            });
            // Add active class to clicked option
            this.classList.add('active');
        });
    });

    // Advanced slider interactions
    const qualitySlider = document.getElementById('qualitySlider');
    if (qualitySlider) {
        qualitySlider.addEventListener('input', function() {
            const value = this.value;
            const percentage = ((value - this.min) / (this.max - this.min)) * 100;
            this.style.setProperty('--slider-percentage', `${percentage}%`);

            // Dynamic color based on quality
            const hue = 120 - (value / 100) * 120; // Green to red
            this.style.setProperty('--slider-color', `hsl(${hue}, 70%, 50%)`);
        });
    }
}

// Initialize particle system
function initializeParticleSystem() {
    const particleContainer = document.createElement('div');
    particleContainer.className = 'particles-container';
    document.querySelector('.hero-section').appendChild(particleContainer);

    // Create particles
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
        particleContainer.appendChild(particle);
    }

    // Mouse interaction
    document.addEventListener('mousemove', (e) => {
        const particles = document.querySelectorAll('.particle');
        particles.forEach(particle => {
            const rect = particle.getBoundingClientRect();
            const distance = Math.sqrt(
                Math.pow(e.clientX - rect.left, 2) + Math.pow(e.clientY - rect.top, 2)
            );

            if (distance < 100) {
                const angle = Math.atan2(e.clientY - rect.top, e.clientX - rect.left);
                const force = (100 - distance) / 100;
                particle.style.transform = `translate(${Math.cos(angle) * force * 20}px, ${Math.sin(angle) * force * 20}px)`;
            } else {
                particle.style.transform = 'translate(0, 0)';
            }
        });
    });
}

// Initialize theme switcher
function initializeThemeSwitcher() {
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle btn btn-outline-light position-fixed';
    themeToggle.style.cssText = 'top: 20px; right: 20px; z-index: 1050; border-radius: 50%; width: 50px; height: 50px;';
    themeToggle.innerHTML = '<i class="bi bi-moon-stars"></i>';
    document.body.appendChild(themeToggle);

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'neon' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);

        // Show theme change animation
        showThemeTransition();
    });

    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        switch(theme) {
            case 'light':
                icon.className = 'bi bi-sun';
                break;
            case 'dark':
                icon.className = 'bi bi-moon-stars';
                break;
            case 'neon':
                icon.className = 'bi bi-stars';
                break;
        }
    }

    function showThemeTransition() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.8);
            z-index: 9999;
            animation: theme-transition 0.5s ease-out;
        `;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 500);
    }
}

// Utility functions
let batchFilesArray = [];

// Enhanced error handling
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showToast('حدث خطأ غير متوقع. يرجى إعادة تحميل الصفحة.', 'danger');
});

// Performance monitoring
if ('performance' in window && 'memory' in performance) {
    setInterval(() => {
        console.log('Memory usage:', performance.memory);
    }, 10000);
}
