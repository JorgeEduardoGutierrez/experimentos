document.addEventListener('DOMContentLoaded', () => {
    const githubUsername = 'JorgeEduardoGutierrez';
    const repositoryName = 'JorgeEduardoGutierrez.github.io';
    const githubToken = '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'; // Reemplaza con tu token de acceso personal

    /**
     * Muestra u oculta el indicador de carga.
     * @param {boolean} show - Si es true, muestra el indicador; si es false, lo oculta.
     */
    function showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Realiza una solicitud a la API de GitHub con autenticación opcional.
     * Si recibe un error 401, reintenta sin autenticación.
     * @param {string} url - La URL de la API de GitHub.
     * @returns {Promise<Object>} - La respuesta JSON de la API.
     */
    async function fetchFromGitHubAPI(url) {
        try {
            const headers = githubToken ? { 'Authorization': `token ${githubToken}` } : {};
            const response = await fetch(url, { headers });

            if (response.status === 401) {
                console.warn('Token de GitHub no válido o caducado. Continuando sin autenticación.');
                return fetchFromGitHubAPIWithoutAuth(url);
            }

            if (!response.ok) {
                throw new Error(`Error de la API de GitHub: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error al realizar la solicitud a la API de GitHub:', error);
            throw error;
        }
    }

    /**
     * Realiza una solicitud a la API de GitHub sin autenticación.
     * @param {string} url - La URL de la API de GitHub.
     * @returns {Promise<Object>} - La respuesta JSON de la API.
     */
    async function fetchFromGitHubAPIWithoutAuth(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error de la API de GitHub (sin autenticación): ${response.status} ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error al realizar la solicitud a la API de GitHub sin autenticación:', error);
            throw error;
        }
    }

    /**
     * Carga las carpetas principales desde GitHub y las agrega al menú lateral.
     */
    async function loadMainFolders() {
        try {
            showLoading(true);
            const folders = await fetchFromGitHubAPI(`https://api.github.com/repos/${githubUsername}/${repositoryName}/contents/data`);
            const sidebarMenu = document.getElementById('sidebarMenu');
            if (!sidebarMenu) {
                console.error('No se encontró el elemento con ID sidebarMenu.');
                return;
            }
            sidebarMenu.innerHTML = ''; // Limpiar contenido existente

            const mainFolders = folders.filter(folder => folder.type === 'dir');
            if (mainFolders.length === 0) {
                sidebarMenu.innerHTML = '<p>No se encontraron carpetas principales.</p>';
                return;
            }

            mainFolders.forEach(folder => {
                const listItem = document.createElement('li');
                listItem.className = 'nav-item';

                const link = document.createElement('a');
                link.href = '#';
                link.className = 'nav-link';
                link.textContent = folder.name;

                link.addEventListener('click', async (e) => {
                    e.preventDefault();
                    setActiveLink(link);
                    await loadExperimentSet(folder.name);
                });

                listItem.appendChild(link);
                sidebarMenu.appendChild(listItem);
            });

            // Seleccionar y cargar la primera carpeta por defecto
            const firstLink = document.querySelector('#sidebarMenu .nav-link');
            if (firstLink) {
                setActiveLink(firstLink);
                await loadExperimentSet(mainFolders[0].name);
            }
        } catch (error) {
            console.error('Error al cargar carpetas principales:', error);
            alert('Hubo un error al cargar las carpetas principales. Por favor, inténtalo de nuevo más tarde.');
        } finally {
            showLoading(false);
        }
    }

    /**
     * Resalta el enlace activo en el menú lateral.
     * @param {HTMLElement} selectedLink - El enlace que se debe resaltar.
     */
    function setActiveLink(selectedLink) {
        const links = document.querySelectorAll('#sidebarMenu .nav-link');
        links.forEach(link => link.classList.remove('active'));
        selectedLink.classList.add('active');
    }

    /**
     * Carga el conjunto de experimentos para un tipo de experimento específico.
     * @param {string} experimentType - El nombre del tipo de experimento.
     */
    async function loadExperimentSet(experimentType) {
        try {
            showLoading(true);
            const experimentTabs = document.getElementById('experimentTabs');
            const experimentTabsContent = document.getElementById('experimentTabsContent');
            if (!experimentTabs || !experimentTabsContent) {
                console.error('No se encontraron los elementos experimentTabs o experimentTabsContent.');
                return;
            }

            experimentTabs.innerHTML = '';
            experimentTabsContent.innerHTML = '';

            const data = await fetchFromGitHubAPI(`https://api.github.com/repos/${githubUsername}/${repositoryName}/contents/data/${experimentType}`);
            const experimentFolders = data.filter(item => item.type === 'dir');

            if (experimentFolders.length === 0) {
                experimentTabsContent.innerHTML = '<p>No se encontraron experimentos.</p>';
                return;
            }

            for (let index = 0; index < experimentFolders.length; index++) {
                const folder = experimentFolders[index];
                const expId = index + 1;
                createExperimentTab(folder.name, expId);
                await createExperimentContent(folder.name, experimentType, expId);
            }
        } catch (error) {
            console.error('Error al cargar los experimentos:', error);
            alert('Hubo un error al cargar los experimentos. Por favor, inténtalo de nuevo más tarde.');
        } finally {
            showLoading(false);
        }
    }

    /**
     * Crea una pestaña para un experimento.
     * @param {string} folderName - El nombre de la carpeta del experimento.
     * @param {number} expId - El ID del experimento.
     */
    function createExperimentTab(folderName, expId) {
        const experimentTabs = document.getElementById('experimentTabs');
        const tabItem = document.createElement('li');
        tabItem.className = 'nav-item';
        tabItem.innerHTML = `
            <button class="nav-link ${expId === 1 ? 'active' : ''}" id="exp${expId}-tab" data-bs-toggle="tab" data-bs-target="#exp${expId}" type="button" role="tab" aria-controls="exp${expId}" aria-selected="${expId === 1}">
                ${folderName}
            </button>
        `;
        experimentTabs.appendChild(tabItem);
    }

    /**
     * Crea y carga el contenido para un experimento específico.
     * @param {string} folderName - El nombre de la carpeta del experimento.
     * @param {string} experimentType - El tipo de experimento.
     * @param {number} expId - El ID del experimento.
     */
    async function createExperimentContent(folderName, experimentType, expId) {
        try {
            const experimentTabsContent = document.getElementById('experimentTabsContent');
            const tabContent = document.createElement('div');
            tabContent.className = `tab-pane fade ${expId === 1 ? 'show active' : ''}`;
            tabContent.id = `exp${expId}`;
            tabContent.setAttribute('role', 'tabpanel');
            tabContent.setAttribute('aria-labelledby', `exp${expId}-tab`);

            // Cargar el archivo config.json
            const config = await fetchGitHubFile(`data/${experimentType}/${folderName}/config.json`);

            // Construir el HTML para la descripción
            const descripcionHTML = `
                <div class="row mb-3">
                    <div class="col-12">
                        <h5>Descripción</h5>
                        <pre>${Object.entries(config.Descripcion).map(([key, value]) => `${key}: ${value}`).join('\n')}</pre>
                    </div>
                </div>
            `;

            // Construir el HTML para la configuración
            const configuracionHTML = `
                <div class="card my-4">
                    <div class="card-header bg-secondary text-white">
                        <h2>Configuración del Entorno</h2>
                    </div>
                    <div class="card-body">
                        ${descripcionHTML}
                        <div class="row">
                            <div class="col-md-6">
                                <h5>Entrenamiento</h5>
                                <pre>${Object.entries(config.Entrenamiento).map(([key, value]) => `${key}: ${value}`).join('\n')}</pre>
                            </div>
                            <div class="col-md-6">
                                <h5>Test</h5>
                                <pre>${Object.entries(config.Test).map(([key, value]) => `${key}: ${value}`).join('\n')}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            tabContent.innerHTML = configuracionHTML;

            // Cargar la imagen del entorno
            const imagenEnvHTML = `
                <div class="card my-4">
                    <div class="card-body text-center">
                        <img src="https://raw.githubusercontent.com/${githubUsername}/${repositoryName}/main/data/${experimentType}/${folderName}/env.png" alt="Imagen de Entorno" class="img-fluid">
                    </div>
                </div>
            `;
            tabContent.innerHTML += imagenEnvHTML;

            // Crear el contenedor para los gráficos antes de llamar a loadChartData
            const chartsContainerId = `chartsContainer${expId}`;
            const chartsContainerHTML = `<div id="${chartsContainerId}" class="row my-4"></div>`;
            tabContent.innerHTML += chartsContainerHTML;

            // Añadir el contenido de la pestaña al DOM antes de cargar los gráficos
            experimentTabsContent.appendChild(tabContent);

            // Cargar los datos del gráfico
            await loadChartData(`data/${experimentType}/${folderName}/tensorflow.json`, chartsContainerId);

            // Cargar la imagen de resultados
            const imagenHTML = `
                <div class="card my-4">
                    <div class="card-header bg-secondary text-white">
                        <h2>Gráfica resultados del test del modelo aprendido</h2>
                    </div>
                    <div class="card-body text-center">
                        <img src="https://raw.githubusercontent.com/${githubUsername}/${repositoryName}/main/data/${experimentType}/${folderName}/pie_chart.png" alt="Pie Chart" class="img-fluid">
                    </div>
                </div>
            `;
            tabContent.innerHTML += imagenHTML;

            // Cargar los videos del experimento
            await loadExperimentVideos(folderName, experimentType, expId, tabContent);
        } catch (error) {
            console.error('Error al cargar el contenido del experimento:', error);
            alert('Hubo un error al cargar el contenido del experimento. Por favor, inténtalo de nuevo más tarde.');
        }
    }

    /**
     * Carga un archivo JSON desde GitHub, manejando archivos grandes mediante download_url si es necesario.
     * @param {string} path - La ruta del archivo en el repositorio.
     * @returns {Promise<Object>} - El contenido del archivo JSON.
     */
    async function fetchGitHubFile(path) {
        try {
            const data = await fetchFromGitHubAPI(`https://api.github.com/repos/${githubUsername}/${repositoryName}/contents/${path}`);
            let content = null;

            if (data && data.content) {
                content = atob(data.content);
            } else if (data && data.download_url) {
                const response = await fetch(data.download_url);
                if (!response.ok) throw new Error(`Error al descargar el archivo: ${response.status} ${response.statusText}`);
                content = await response.text();
            } else {
                throw new Error('Archivo no encontrado o formato incorrecto');
            }

            return JSON.parse(content);
        } catch (error) {
            console.error('Error al cargar el archivo JSON:', error);
            throw error;
        }
    }

    /**
     * Carga y muestra los datos del gráfico utilizando Chart.js.
     * @param {string} jsonPath - La ruta del archivo JSON con los datos del gráfico.
     * @param {string} containerId - El ID del contenedor donde se insertarán los gráficos.
     */
    async function loadChartData(jsonPath, containerId) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`Contenedor con ID ${containerId} no encontrado en el DOM.`);
                return;
            }

            const data = await fetchFromGitHubAPI(`https://api.github.com/repos/${githubUsername}/${repositoryName}/contents/${jsonPath}`);
            let content = null;

            if (data && data.content) {
                content = atob(data.content); // Decodificar si está en base64
            } else if (data && data.download_url) {
                const response = await fetch(data.download_url);
                if (!response.ok) throw new Error(`Error al descargar el archivo: ${response.status} ${response.statusText}`);
                content = await response.text(); // Descargar el contenido del archivo grande
            } else {
                throw new Error('Datos JSON no encontrados o malformados');
            }

            const decodedData = JSON.parse(content);
            console.log("Datos del gráfico cargados:", decodedData); // Verificar el contenido de los datos

            container.innerHTML = ''; // Limpiar el contenedor de gráficos

            let index = 0;
            for (const key in decodedData) {
                const chartWrapper = document.createElement('div');
                chartWrapper.className = 'col-md-6 mb-4';
                const chartCanvas = document.createElement('canvas');
                chartCanvas.id = `${containerId}_${index}`;
                chartWrapper.appendChild(chartCanvas);
                container.appendChild(chartWrapper);

                // Verificar datos antes de crear el gráfico
                console.log(`Datos para la gráfica "${key}":`, decodedData[key]);

                new Chart(chartCanvas.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: Array.from({ length: decodedData[key].length }, (_, i) => i + 1),
                        datasets: [{
                            label: key.replace(/_/g, ' '),
                            data: decodedData[key],
                            borderColor: `hsl(${index * 50 % 360}, 70%, 50%)`,
                            fill: false
                        }]
                    },
                    options: { responsive: true }
                });
                index++;
            }
        } catch (error) {
            console.error('Error al cargar los datos del gráfico:', error);
        }
    }

    /**
     * Carga y muestra los videos del experimento.
     * @param {string} folderName - El nombre de la carpeta del experimento.
     * @param {string} experimentType - El tipo de experimento.
     * @param {number} expId - El ID del experimento.
     * @param {HTMLElement} tabContent - El contenedor de la pestaña actual.
     */
    async function loadExperimentVideos(folderName, experimentType, expId, tabContent) {
        try {
            const files = await fetchFromGitHubAPI(`https://api.github.com/repos/${githubUsername}/${repositoryName}/contents/data/${experimentType}/${folderName}`);
            const videos = files.filter(file => /^\d+\.mp4$/.test(file.name));

            if (videos.length === 0) {
                return; // No hay videos para mostrar
            }

            const videoListHTML = videos.map(video => `
                <a href="#" class="btn btn-outline-primary btn-sm m-1 video-link" data-video-src="https://raw.githubusercontent.com/${githubUsername}/${repositoryName}/main/data/${experimentType}/${folderName}/${video.name}">
                    ${video.name}
                </a>
            `).join('');

            const videosHTML = `
                <div class="card my-4">
                    <div class="card-header bg-secondary text-white">
                        <h2>Videos del Experimento</h2>
                    </div>
                    <div class="card-body">
                        <div id="videoList${expId}" class="mb-3">${videoListHTML}</div>
                        <div class="ratio ratio-16x9">
                            <video id="mainVideo${expId}" controls>
                                <source src="https://raw.githubusercontent.com/${githubUsername}/${repositoryName}/main/data/${experimentType}/${folderName}/${videos[0].name}" type="video/mp4">
                                Tu navegador no soporta la etiqueta de video.
                            </video>
                        </div>
                    </div>
                </div>
            `;

            tabContent.innerHTML += videosHTML;

            // Añadir manejadores de eventos a los enlaces de video
            const videoLinks = tabContent.querySelectorAll(`#videoList${expId} .video-link`);
            videoLinks.forEach(link => {
                link.addEventListener('click', (event) => {
                    event.preventDefault();
                    const videoSrc = link.getAttribute('data-video-src');
                    const mainVideo = tabContent.querySelector(`#mainVideo${expId}`);
                    if (mainVideo) {
                        mainVideo.src = videoSrc;
                        mainVideo.play();
                    }
                });
            });
        } catch (error) {
            console.error('Error al cargar los videos:', error);
        }
    }

    /**
     * Carga un archivo JSON desde GitHub, manejando archivos grandes mediante download_url si es necesario.
     * @param {string} path - La ruta del archivo en el repositorio.
     * @returns {Promise<Object>} - El contenido del archivo JSON.
     */
    async function fetchGitHubFile(path) {
        try {
            const data = await fetchFromGitHubAPI(`https://api.github.com/repos/${githubUsername}/${repositoryName}/contents/${path}`);
            let content = null;

            if (data && data.content) {
                content = atob(data.content);
            } else if (data && data.download_url) {
                const response = await fetch(data.download_url);
                if (!response.ok) throw new Error(`Error al descargar el archivo: ${response.status} ${response.statusText}`);
                content = await response.text();
            } else {
                throw new Error('Archivo no encontrado o formato incorrecto');
            }

            return JSON.parse(content);
        } catch (error) {
            console.error('Error al cargar el archivo JSON:', error);
            throw error;
        }
    }

    // Iniciar la aplicación
    loadMainFolders();
});
