// frontend/js/scripts.js

document.addEventListener('DOMContentLoaded', () => {
    const apiBase = 'http://localhost:3000/api/github/contents/'; // Cambia si tu backend está en otro puerto o dominio

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
     * Realiza una solicitud al backend para obtener contenido de GitHub.
     * @param {string} path - La ruta en el repositorio de GitHub.
     * @returns {Promise<Object>} - La respuesta JSON del backend.
     */
    async function fetchFromBackend(path) {
        try {
            const response = await fetch(`${apiBase}${path}`);
            if (!response.ok) {
                throw new Error(`Error del backend: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error al realizar la solicitud al backend:', error);
            throw error;
        }
    }

    /**
     * Carga las carpetas principales (algoritmos) desde GitHub y las agrega al menú lateral.
     */
    async function loadMainFolders() {
        try {
            showLoading(true);
            const folders = await fetchFromBackend('data');
            const sidebarMenu = document.getElementById('sidebarMenu');
            if (!sidebarMenu) {
                console.error('No se encontró el elemento con ID sidebarMenu.');
                return;
            }
            sidebarMenu.innerHTML = ''; // Limpiar contenido existente

            const mainFolders = folders.filter(folder => folder.type === 'dir');
            if (mainFolders.length === 0) {
                sidebarMenu.innerHTML = '<p>No se encontraron algoritmos principales.</p>';
                return;
            }

            mainFolders.forEach(folder => {
                // Crear un item de lista para cada algoritmo
                const listItem = document.createElement('li');
                listItem.className = 'nav-item';

                // Botón desplegable para los experimentos
                const dropdown = document.createElement('div');
                dropdown.className = 'dropdown';

                const dropdownButton = document.createElement('button');
                dropdownButton.className = 'btn btn-secondary dropdown-toggle nav-link';
                dropdownButton.type = 'button';
                dropdownButton.id = `dropdown-${folder.name}`;
                dropdownButton.setAttribute('data-bs-toggle', 'dropdown');
                dropdownButton.setAttribute('aria-expanded', 'false');
                dropdownButton.textContent = folder.name;

                const dropdownMenu = document.createElement('ul');
                dropdownMenu.className = 'dropdown-menu';
                dropdownMenu.setAttribute('aria-labelledby', `dropdown-${folder.name}`);
                dropdownMenu.id = `dropdownMenu-${folder.name}`;

                // Event listener para cargar los experimentos al hacer clic en el algoritmo
                dropdownButton.addEventListener('click', async () => {
                    await loadExperimentSet(folder.name);
                });

                dropdown.appendChild(dropdownButton);
                dropdown.appendChild(dropdownMenu);
                listItem.appendChild(dropdown);
                sidebarMenu.appendChild(listItem);
            });

            // Opcional: Seleccionar y cargar el primer algoritmo por defecto
            if (mainFolders.length > 0) {
                const firstAlgorithm = mainFolders[0].name;
                const firstDropdownButton = document.getElementById(`dropdown-${firstAlgorithm}`);
                if (firstDropdownButton) {
                    firstDropdownButton.click();
                }
            }
        } catch (error) {
            console.error('Error al cargar carpetas principales:', error);
            alert('Hubo un error al cargar los algoritmos principales. Por favor, inténtalo de nuevo más tarde.');
        } finally {
            showLoading(false);
        }
    }

    /**
     * Carga el conjunto de experimentos para un tipo de experimento específico.
     * @param {string} experimentType - El nombre del tipo de experimento (algoritmo).
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

            const data = await fetchFromBackend(`data/${experimentType}`);
            const experimentFolders = data.filter(item => item.type === 'dir');

            if (experimentFolders.length === 0) {
                experimentTabsContent.innerHTML = '<p>No se encontraron experimentos para este algoritmo.</p>';
                return;
            }

            for (let index = 0; index < experimentFolders.length; index++) {
                const folder = experimentFolders[index];
                const expId = index + 1;
                createExperimentTab(folder.name, expId);
                await createExperimentContent(folder.name, experimentType, expId);
            }

            // Activar la primera pestaña por defecto
            const firstTab = document.querySelector('#experimentTabs .nav-link');
            if (firstTab) {
                firstTab.classList.add('active');
                const firstTabContent = document.querySelector('#experimentTabsContent .tab-pane');
                if (firstTabContent) {
                    firstTabContent.classList.add('show', 'active');
                }
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
            <button class="nav-link" id="exp${expId}-tab" data-bs-toggle="tab" data-bs-target="#exp${expId}" type="button" role="tab" aria-controls="exp${expId}" aria-selected="false">
                ${folderName}
            </button>
        `;
        experimentTabs.appendChild(tabItem);
    }

    /**
     * Crea y carga el contenido para un experimento específico.
     * @param {string} folderName - El nombre de la carpeta del experimento.
     * @param {string} experimentType - El tipo de experimento (algoritmo).
     * @param {number} expId - El ID del experimento.
     */
    async function createExperimentContent(folderName, experimentType, expId) {
        try {
            const experimentTabsContent = document.getElementById('experimentTabsContent');
            const tabContent = document.createElement('div');
            tabContent.className = `tab-pane fade`;
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
                        <img src="https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPOSITORY_NAME}/main/data/${experimentType}/${folderName}/env.png" alt="Imagen de Entorno" class="img-fluid">
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
                        <img src="https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPOSITORY_NAME}/main/data/${experimentType}/${folderName}/pie_chart.png" alt="Pie Chart" class="img-fluid">
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
     * Carga un archivo JSON desde GitHub.
     * @param {string} path - La ruta del archivo en el repositorio.
     * @returns {Promise<Object>} - El contenido del archivo JSON o una lista de archivos si es una carpeta.
     */
    async function fetchGitHubFile(path) {
        try {
            const data = await fetchFromBackend(path);
            let content = null;

            if (Array.isArray(data)) {
                // Si es una lista de archivos/carpeta
                return data;
            }

            if (data && data.content) {
                content = atob(data.content);
            } else if (data && data.download_url) {
                const response = await fetch(data.download_url);
                if (!response.ok) throw new Error(`Error al descargar el archivo: ${response.status} ${response.statusText}`);
                content = await response.text(); // Descargar el contenido del archivo grande
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

            const decodedData = await fetchGitHubFile(jsonPath);
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
     * @param {string} experimentType - El tipo de experimento (algoritmo).
     * @param {number} expId - El ID del experimento.
     * @param {HTMLElement} tabContent - El contenedor de la pestaña actual.
     */
    async function loadExperimentVideos(folderName, experimentType, expId, tabContent) {
        try {
            const files = await fetchGitHubFile(`data/${experimentType}/${folderName}`);
            const videos = files.filter(file => /^\d+\.mp4$/.test(file.name));

            if (videos.length === 0) {
                return; // No hay videos para mostrar
            }

            const videoListHTML = videos.map(video => `
                <a href="#" class="btn btn-outline-primary btn-sm m-1 video-link" data-video-src="https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPOSITORY_NAME}/main/data/${experimentType}/${folderName}/${video.name}">
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
                                <source src="https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPOSITORY_NAME}/main/data/${experimentType}/${folderName}/${videos[0].name}" type="video/mp4">
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
     * Inicia la aplicación cargando las carpetas principales (algoritmos).
     */
    loadMainFolders();
});
