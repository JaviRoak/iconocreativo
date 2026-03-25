(function () {
    const svg = document.querySelector(".global-wave-svg");
    const cursorTrace = document.querySelector(".cursor-trace");
    const trailCanvas = document.querySelector(".cursor-trail-layer");
    const scrollCards = Array.from(document.querySelectorAll(".scroll-card"));
    const revealShowcase = document.querySelector(".reveal-showcase");
    const revealRows = Array.from(document.querySelectorAll(".reveal-row"));
    const revealPreview = document.querySelector(".reveal-preview");
    const revealPreviewImage = revealPreview ? revealPreview.querySelector("img") : null;
    const revealTitles = Array.from(document.querySelectorAll(".reveal-copy h3"));

    if (!svg) {
        return;
    }

    const trailContext = trailCanvas ? trailCanvas.getContext("2d") : null;

    const state = {
        width: window.innerWidth,
        height: window.innerHeight,
        lineCount: 0,
        pointCount: 0,
        spacingX: 18,
        spacingY: 20,
        lines: [],
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        trail: [],
        pointer: {
            x: window.innerWidth * 0.5,
            y: window.innerHeight * 0.5,
            tx: window.innerWidth * 0.5,
            ty: window.innerHeight * 0.5,
            active: false,
            traceX: window.innerWidth * 0.5,
            traceY: window.innerHeight * 0.5
        }
    };
    let revealObserver = null;
    let previewTargetX = 0;
    let previewTargetY = 0;
    let previewCurrentX = 0;
    let previewCurrentY = 0;

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function setup() {
        state.width = window.innerWidth;
        state.height = window.innerHeight;
        svg.setAttribute("viewBox", `0 0 ${state.width} ${state.height}`);
        svg.innerHTML = "";

        if (trailCanvas && trailContext) {
            trailCanvas.width = Math.floor(state.width * state.pixelRatio);
            trailCanvas.height = Math.floor(state.height * state.pixelRatio);
            trailCanvas.style.width = `${state.width}px`;
            trailCanvas.style.height = `${state.height}px`;
            trailContext.setTransform(state.pixelRatio, 0, 0, state.pixelRatio, 0, 0);
            trailContext.lineCap = "round";
            trailContext.lineJoin = "round";
        }

        state.lineCount = Math.ceil((state.width + 120) / state.spacingX);
        state.pointCount = Math.ceil((state.height + 80) / state.spacingY);
        state.lines = [];

        const startX = (state.width - state.lineCount * state.spacingX) / 2;
        const startY = (state.height - state.pointCount * state.spacingY) / 2;

        for (let i = 0; i < state.lineCount; i += 1) {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("class", "global-wave-line");
            svg.appendChild(path);

            const points = [];

            for (let j = 0; j < state.pointCount; j += 1) {
                points.push({
                    x: startX + i * state.spacingX,
                    y: startY + j * state.spacingY,
                    offsetX: 0,
                    offsetY: 0
                });
            }

            state.lines.push({ path, points, seed: i * 0.17 });
        }
    }

    function addTrailPoint() {
        const lastPoint = state.trail[state.trail.length - 1];
        const dx = state.pointer.traceX - (lastPoint ? lastPoint.x : state.pointer.traceX);
        const dy = state.pointer.traceY - (lastPoint ? lastPoint.y : state.pointer.traceY);
        const distance = Math.hypot(dx, dy);

        if (lastPoint && distance < 4) {
            return;
        }

        state.trail.push({
            x: state.pointer.traceX,
            y: state.pointer.traceY,
            life: 1
        });

        if (state.trail.length > 80) {
            state.trail.shift();
        }
    }

    function drawTrail() {
        if (!trailContext || !trailCanvas) {
            return;
        }

        trailContext.clearRect(0, 0, state.width, state.height);

        if (state.pointer.active) {
            addTrailPoint();
        }

        state.trail = state.trail
            .map(function (point) {
                return {
                    x: point.x,
                    y: point.y,
                    life: point.life - 0.035
                };
            })
            .filter(function (point) {
                return point.life > 0;
            });

        if (state.trail.length < 2) {
            return;
        }

        for (let i = 1; i < state.trail.length; i += 1) {
            const previous = state.trail[i - 1];
            const current = state.trail[i];
            const alpha = Math.min(previous.life, current.life);

            trailContext.beginPath();
            trailContext.moveTo(previous.x, previous.y);
            trailContext.lineTo(current.x, current.y);
            trailContext.strokeStyle = `rgba(255, 157, 31, ${alpha * 0.85})`;
            trailContext.lineWidth = 1.5 + alpha * 3.5;
            trailContext.shadowBlur = 10 + alpha * 18;
            trailContext.shadowColor = "rgba(255, 157, 31, 0.5)";
            trailContext.stroke();
        }

        trailContext.shadowBlur = 0;
    }

    function setupRevealTitles() {
        if (!revealTitles.length) {
            return;
        }

        revealTitles.forEach(function (title) {
            const text = title.textContent || "";

            if (!text.trim() || title.dataset.enhanced === "true") {
                return;
            }

            title.dataset.enhanced = "true";
            title.classList.add("reveal-title");
            title.setAttribute("aria-label", text.trim());
            title.textContent = "";

            let charIndex = 0;

            text.split(" ").forEach(function (word, wordIndex, wordsArray) {
                const wordWrap = document.createElement("span");
                wordWrap.className = "reveal-title-word";
                wordWrap.setAttribute("aria-hidden", "true");

                Array.from(word).forEach(function (character) {
                    const charWrap = document.createElement("span");
                    const charBase = document.createElement("span");
                    const charHover = document.createElement("span");

                    charWrap.className = "reveal-title-char";
                    charWrap.style.setProperty("--char-delay", `${charIndex * 24}ms`);
                    charBase.className = "reveal-title-char-inner";
                    charHover.className = "reveal-title-char-hover";
                    charBase.textContent = character;
                    charHover.textContent = character;
                    charWrap.setAttribute("aria-hidden", "true");

                    charWrap.appendChild(charBase);
                    charWrap.appendChild(charHover);
                    wordWrap.appendChild(charWrap);
                    charIndex += 1;
                });

                title.appendChild(wordWrap);

                if (wordIndex < wordsArray.length - 1) {
                    const spaceWrap = document.createElement("span");
                    const spaceBase = document.createElement("span");
                    const spaceHover = document.createElement("span");

                    spaceWrap.className = "reveal-title-char reveal-title-space";
                    spaceWrap.style.setProperty("--char-delay", `${charIndex * 24}ms`);
                    spaceBase.className = "reveal-title-char-inner";
                    spaceHover.className = "reveal-title-char-hover";
                    spaceBase.innerHTML = "&nbsp;";
                    spaceHover.innerHTML = "&nbsp;";
                    spaceWrap.setAttribute("aria-hidden", "true");

                    spaceWrap.appendChild(spaceBase);
                    spaceWrap.appendChild(spaceHover);
                    title.appendChild(spaceWrap);
                    charIndex += 1;
                }
            });
        });
    }

    function setupImageReveal() {
        if (!revealShowcase || !revealPreview || !revealPreviewImage || !revealRows.length) {
            return;
        }

        revealRows.forEach(function (row) {
            row.addEventListener("mouseenter", function () {
                const image = row.dataset.image;
                const alt = row.dataset.alt || "";

                revealRows.forEach(function (item) {
                    item.classList.remove("is-active");
                });

                row.classList.add("is-active");

                if (image) {
                    revealPreviewImage.src = image;
                    revealPreviewImage.alt = alt;
                }

                revealShowcase.classList.add("is-preview-visible");
            });
        });

        revealShowcase.addEventListener("mousemove", function (event) {
            const bounds = revealShowcase.getBoundingClientRect();
            const previewWidth = 280;
            const previewHeight = 360;
            const localX = event.clientX - bounds.left;
            const localY = event.clientY - bounds.top;
            const cursorOffsetX = 230;

            previewTargetX = clamp(localX - previewWidth * 0.5 + cursorOffsetX, 0, Math.max(bounds.width - previewWidth, 0));
            previewTargetY = clamp(localY - previewHeight * 0.5, 0, Math.max(bounds.height - previewHeight, 0));
        });

        revealShowcase.addEventListener("mouseleave", function () {
            revealShowcase.classList.remove("is-preview-visible");
            revealRows.forEach(function (row) {
                row.classList.remove("is-active");
            });
        });
    }

    function updateScrollCards() {
        const viewportHeight = window.innerHeight || 1;

        scrollCards.forEach(function (card) {
            const rect = card.getBoundingClientRect();
            const speed = Number(card.dataset.scrollSpeed || 0.12);
            const progress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
            const clampedProgress = clamp(progress, 0, 1);
            const shift = (0.5 - clampedProgress) * 18 * speed * 4;
            const tilt = (0.5 - clampedProgress) * 3.2 * speed;

            card.style.setProperty("--card-shift", `${shift.toFixed(2)}px`);
            card.style.setProperty("--card-tilt", `${tilt.toFixed(2)}deg`);
        });
    }

    function setupCardReveal() {
        if (!scrollCards.length) {
            return;
        }

        if ("IntersectionObserver" in window) {
            revealObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        revealObserver.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.16,
                rootMargin: "0px 0px -8% 0px"
            });

            scrollCards.forEach(function (card, index) {
                card.style.transitionDelay = `${Math.min(index * 45, 220)}ms`;
                revealObserver.observe(card);
            });
        } else {
            scrollCards.forEach(function (card) {
                card.classList.add("is-visible");
            });
        }

        updateScrollCards();
    }

    function draw(time) {
        state.pointer.x += (state.pointer.tx - state.pointer.x) * 0.08;
        state.pointer.y += (state.pointer.ty - state.pointer.y) * 0.08;
        state.pointer.traceX += (state.pointer.tx - state.pointer.traceX) * 0.18;
        state.pointer.traceY += (state.pointer.ty - state.pointer.traceY) * 0.18;

        const pointerRadius = state.pointer.active ? 190 : 110;
        const pointerStrength = state.pointer.active ? 26 : 10;

        for (const line of state.lines) {
            let d = "";

            line.points.forEach((point, index) => {
                const waveA = Math.sin(time * 0.0008 + point.y * 0.012 + line.seed) * 10;
                const waveB = Math.cos(time * 0.00045 + point.y * 0.02 - line.seed * 1.8) * 6;
                const waveX = waveA + waveB;
                const waveY = Math.sin(time * 0.0006 + point.x * 0.01 + line.seed) * 3;

                const dx = point.x - state.pointer.x;
                const dy = point.y - state.pointer.y;
                const distance = Math.hypot(dx, dy);
                const influence = clamp(1 - distance / pointerRadius, 0, 1);

                point.offsetX += ((dx / (distance || 1)) * influence * pointerStrength - point.offsetX) * 0.09;
                point.offsetY += ((dy / (distance || 1)) * influence * pointerStrength * 0.35 - point.offsetY) * 0.09;

                point.offsetX *= 0.96;
                point.offsetY *= 0.96;

                const x = point.x + waveX + point.offsetX;
                const y = point.y + waveY + point.offsetY;

                d += index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
            });

            line.path.setAttribute("d", d);
        }

        drawTrail();

        if (revealShowcase && revealPreview) {
            previewCurrentX += (previewTargetX - previewCurrentX) * 0.16;
            previewCurrentY += (previewTargetY - previewCurrentY) * 0.16;
            revealShowcase.style.setProperty("--preview-x", `${previewCurrentX.toFixed(2)}px`);
            revealShowcase.style.setProperty("--preview-y", `${previewCurrentY.toFixed(2)}px`);
        }

        if (cursorTrace) {
            cursorTrace.style.opacity = state.pointer.active ? "1" : "0";
            cursorTrace.style.transform = `translate3d(${state.pointer.traceX}px, ${state.pointer.traceY}px, 0) translate(-50%, -50%) scale(${state.pointer.active ? 1 : 0.7})`;
        }

        window.requestAnimationFrame(draw);
    }

    window.addEventListener("resize", setup);
    window.addEventListener("scroll", updateScrollCards, { passive: true });

    window.addEventListener("mousemove", function (event) {
        state.pointer.tx = event.clientX;
        state.pointer.ty = event.clientY;
        state.pointer.active = true;
    });

    window.addEventListener("mouseleave", function () {
        state.pointer.active = false;
        state.pointer.tx = state.width * 0.5;
        state.pointer.ty = state.height * 0.5;
    });

    window.addEventListener("touchmove", function (event) {
        if (!event.touches[0]) {
            return;
        }

        state.pointer.tx = event.touches[0].clientX;
        state.pointer.ty = event.touches[0].clientY;
        state.pointer.active = true;
    }, { passive: true });

    window.addEventListener("touchend", function () {
        state.pointer.active = false;
    });

    setup();
    setupCardReveal();
    setupRevealTitles();
    setupImageReveal();
    window.requestAnimationFrame(draw);
}());
