class VersionManager {
	constructor(elementId, prefix = 'v', number = '0.0') {
		this.element = document.getElementById(elementId);
		this.version = { prefix, number };
		this.modal = this.createModal();
		this.overlay = this.createOverlay();
		this.setupEventListeners();
		this.updateVersion();
	}

	createModal() {
		const modal = document.createElement('div');
		modal.className = 'changelog-modal';
		modal.innerHTML = `
            <button class="close-button" aria-label="Close changelog">×</button>
            <div class="content"></div>
        `;

		const style = document.createElement('style');
		style.textContent = `
            .changelog-modal {
                display: none;
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 1rem;
                max-height: 80vh;
                max-width: 80vw;
                overflow-y: auto;
                border: .1rem solid #ccc;
                border-radius: .2rem;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                opacity: 0;
                transition: opacity 0.2s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)
            }
            .changelog-modal.visible {
                opacity: 1;
            }
            .close-button {
                position: absolute;
                top: 10px;
                right: 10px;
                border: none;
                background: none;
                font-size: 24px;
                cursor: pointer;
                padding: 0 8px;
                color: #666;
                transition: color 0.2s;
            }
            .close-button:hover {
                color: #333;
            }
            .modal-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                color: #000;
                z-index: 999;
                opacity: 0;
                transition: opacity 0.2s ease-in-out;
            }
            .modal-overlay.visible {
                opacity: 1;
            }
            .changelog-content {
                margin-top: 20px;
                line-height: 1.5;
                white-space: pre-wrap;
                font-family: monospace;
            }
        `;
		document.head.appendChild(style);
		document.body.appendChild(modal);
		return modal;
	}

	createOverlay() {
		const overlay = document.createElement('div');
		overlay.className = 'modal-overlay';
		document.body.appendChild(overlay);
		return overlay;
	}

	setupEventListeners() {
		if (!this.element) return;

		this.element.style.cursor = 'pointer';
		this.element.addEventListener('click', (e) => {
			e.preventDefault();
			this.showChangelog();
		});

		const closeButton = this.modal.querySelector('.close-button');
		const closeModal = () => this.hideModal();

		this.overlay.addEventListener('click', closeModal);
		closeButton.addEventListener('click', closeModal);
		this.modal.addEventListener('wheel', e => e.stopPropagation(), { passive: false });

		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.modal.classList.contains('visible')) {
				closeModal();
			}
		});
	}

	async showChangelog() {
		try {
			const response = await fetch('./changelog.txt');
			if (!response.ok) throw new Error('Request failed. See status:', response.status);

			const text = await response.text();
			const content = this.modal.querySelector('.content');
			content.innerHTML = `<div class="changelog-content">${text}</div>`;

			this.modal.style.display = 'block';
			this.overlay.style.display = 'block';

			requestAnimationFrame(() => {
				this.modal.classList.add('visible');
				this.overlay.classList.add('visible');
			});
		} catch (err) {
			console.error('Failed to fetch changelog:', err);
		}
	}

	hideModal() {
		this.modal.classList.remove('visible');
		this.overlay.classList.remove('visible');

		setTimeout(() => {
			this.modal.style.display = 'none';
			this.overlay.style.display = 'none';
		}, 200);
	}

	updateVersion() {
		if (this.element) {
			this.element.textContent = `${this.version.prefix}${this.version.number}`;
		}
	}

	setVersion(prefix, number) {
		this.version = { prefix, number };
		this.updateVersion();
	}
}

const versionManager = new VersionManager('version');