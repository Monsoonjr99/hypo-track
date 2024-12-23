self.onmessage = async function ({ data: { paths } }) {
    try {
        const loadImg = async (path) => {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
            }
            return response.arrayBuffer();
        };

        const imgs = await Promise.all(paths.map(loadImg));
        self.postMessage({ imgs });
    } catch (error) {
        self.postMessage({ error: error.message });
    }
};
