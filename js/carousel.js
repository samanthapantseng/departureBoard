class SimpleCarousel {
    constructor(container, images, labels, options = {}) {
        this.container = container;
        this.images = images;
        this.labels = labels;
        this.options = Object.assign({ gap: 12, height: 500 }, options);
        this.track = null;
        this.build();
    }

    build() {
        this.container.classList.add("simple-carousel");
        this.container.style.setProperty("--gap", this.options.gap + "px");
        this.container.style.height = this.options.height + "px";

        const track = document.createElement("div");
        track.className = "track";
        track.tabIndex = 0;
        this.container.innerHTML = "";
        this.container.appendChild(track);
        this.track = track;

        this.addItems();
        this.enableMouseDrag();
        this.enableWheelScroll();
        this.observeResize();
    }

    addItems() {
        const fragment = document.createDocumentFragment();
        this.images.forEach((src, index) => {
            const item = document.createElement("div");
            item.className = "item";

            const img = document.createElement("img");
            img.src = src;
            img.alt = "";
            item.appendChild(img);

            if (this.labels.length > 0) {
                const labelDiv = document.createElement("div");
                labelDiv.className = "label";
                labelDiv.textContent = this.labels[index].name;
                item.appendChild(labelDiv);
                if (this.labels[index].arrival) {
                    const arrivalDiv = document.createElement("div");
                    arrivalDiv.className = "arrival-time";
                    const date = new Date(this.labels[index].arrival);
                    const hours = date.getHours().toString().padStart(2, "0");
                    const minutes = date
                        .getMinutes()
                        .toString()
                        .padStart(2, "0");
                    const time = `${hours}:${minutes}`;
                    arrivalDiv.textContent = time;
                    item.appendChild(arrivalDiv);
                }
            }

            fragment.appendChild(item);
        });
        this.track.appendChild(fragment);
    }

    enableMouseDrag() {
        let isDragging = false;
        let startX;
        let scrollLeft;

        const onMouseMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - this.track.offsetLeft;
            const walk = x - startX;
            this.track.scrollLeft = scrollLeft - walk;
        };

        this.track.addEventListener("mousedown", (e) => {
            isDragging = true;
            startX = e.pageX - this.track.offsetLeft;
            scrollLeft = this.track.scrollLeft;
            this.track.style.cursor = "grabbing";
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });

        const onMouseUp = () => {
            isDragging = false;
            this.track.style.cursor = "grab";
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
    }

    enableWheelScroll() {
        this.track.addEventListener(
            "wheel",
            (e) => {
                e.preventDefault();
                const scrollAmount = e.deltaY !== 0 ? e.deltaY : e.deltaX;
                this.track.scrollLeft += scrollAmount * 1.2;
            },
            { passive: false }
        );
    }

    observeResize() {
        new ResizeObserver(() => {
            // Optional: could adjust scroll or item sizes if needed
        }).observe(this.track);
    }
}
