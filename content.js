(() => {
    // https://www.instagram.com/malou_maa/?__a=1&__d=dis
    // https://www.instagram.com/graphql/query/?query_hash=55a3c4bad29e4e20c20ff4cdfd80f5b4&variables={"shortcode":"${post_id}"}
    // https://www.instagram.com/graphql/query/?query_hash=90709b530ea0969f002c86a89b4f2b8d&variables={"reel_ids":["${user_id}"],"location_ids":[],"precomposed_overlay":false}
    // https://www.instagram.com/graphql/query/?query_hash=45246d3fe16ccc6577e0bd297a5db1ab&variables={"highlight_reel_ids":["${highlight_id}"],"location_ids":[],"precomposed_overlay":false}

    const cooldownTimer =   200;
    let lastTimeFired = Date.now();

    async function downloadFile(fileSrc, fileName, fileType, tagType) {
        async function download(file) {
            const fileRequest = await fetch(file);
            const fileBlog = await fileRequest.blob();
            const fileURL = URL.createObjectURL(fileBlog);
    
            const link = document.createElement('a');
            link.href = fileURL;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        if (fileType === 'jpg' || fileType === 'jpeg' || fileType === 'png') {
            // file is image

            if (fileType !== 'jpg') {
                convertImgToJpg(fileSrc, function(result) {
                    fileName = `${fileName}.jpg`;
                    download(result);
                });
            } else {
                fileName = `${fileName}.${fileType}`;
                download(fileSrc);
            }
        } else if (fileType === 'mp4') {
            // file is video
            
            fileName = `${fileName}.${fileType}`;
            download(fileSrc);
        } else {
            console.error('Unknown file type', fileType);
        }
    }

    function convertImgToJpg(image, callback) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
        
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, img.width, img.height);
            
            callback(canvas.toDataURL('image/jpg', 1.0));
        }
        img.crossOrigin = 'anonymous';
        img.src = image;
    }

    function isChildOf(/*child node*/c, /*parent node*/p){ //returns boolean
        while((c=c.parentNode)&&c!==p); 
        return !!c; 
    }

    window.onload = function() {
        setAllButtons();

        addEventListener('scroll', (event) => {
            tryToSetAllButtons();
        });

        addEventListener('click', (event) => {
            tryToSetAllButtons();
        });

        addEventListener('keydown', (event) => {
            tryToSetAllButtons();
        });

        addEventListener('mousemove', (event) => {
            tryToSetAllButtons();
        });
    }

    function tryToSetAllButtons() {
        const dateNow = Date.now();
        if ((dateNow - lastTimeFired) > cooldownTimer) {
            lastTimeFired = dateNow;
            setAllButtons();
        }
    }

    async function setAllButtons() {
        if (window.location.pathname.startsWith('/stories/')) {
            const articleImgs = document.querySelectorAll('section section img');
            const articleVideos = document.querySelectorAll('section section video');

            const totalMedias = [...articleImgs, ...articleVideos];

            for (let totalMedia of totalMedias) {
                if ((totalMedia.src && totalMedia.src !== '' && !totalMedia.src.startsWith('chrome-extension')) || (totalMedia.currentSrc && totalMedia.currentSrc !== '' && !totalMedia.currentSrc.startsWith('chrome-extension'))) {
                    if (totalMedia.tagName == 'IMG' && (totalMedia.alt && totalMedia.alt.includes('\'s profile picture'))) {
                        // profile picture
                    } else {
                        if (!totalMedia.parentElement.querySelector('div.instagram-download-button')) {
                            totalMedia.insertAdjacentHTML('beforebegin', `
                                <div class="instagram-download-button">
                                    <img src="${chrome.runtime.getURL('assets/download.png')}">
                                </div>
                            `);

                            const header = document.querySelector('section section header');

                            const button = totalMedia.parentElement.querySelector('div.instagram-download-button');
                            button.style.top = `${header.offsetHeight}px`;
                            button.addEventListener('click', async function() {                                
                                const isHighlights = window.location.pathname.startsWith('/stories/highlights/');

                                let media_index = 0;
                                const dots = header.querySelectorAll('header > div:nth-child(1) > div');
                                for (let i = dots.length - 1; i > -1; i--) {
                                    if (dots[i].querySelectorAll('div').length == 2) {
                                        media_index = i;
                                        break;
                                    }
                                }
                                
                                if (!isHighlights) {
                                    const username = window.location.pathname.replace('/stories/', '').split('/')[0];
                                    downloadStoryMedia(username, media_index);
                                } else {
                                    const username = header.querySelector('header a > img').alt.replace('\'s profile picture', '');
                                    const highlight_id = window.location.pathname.replace('/stories/highlights/', '').replace('/', '');
                                    downloadHighlightStoryMedia(username, highlight_id, media_index);
                                }
                            });
                        }
                    }
                }
            }
        } else {
            const articles = document.querySelectorAll('article');
            for (let article of articles) {
                const articleImgs = article.querySelectorAll('img');
                const articleVideos = article.querySelectorAll('video');

                const totalMedias = [...articleImgs, ...articleVideos];

                for (let totalMedia of totalMedias) {
                    if ((totalMedia.src && totalMedia.src !== '' && !totalMedia.src.startsWith('chrome-extension')) || (totalMedia.currentSrc && totalMedia.currentSrc !== '' && !totalMedia.currentSrc.startsWith('chrome-extension'))) {
                        if (totalMedia.tagName == 'IMG' && (totalMedia.alt && totalMedia.alt.includes('\'s profile picture'))) {
                            const articleHeader = article.querySelector('header');
                            if (isChildOf(totalMedia, articleHeader)) {
                                // profile picture
                            }
                        } else if (totalMedia.tagName == 'VIDEO' || (totalMedia.alt && totalMedia.alt.startsWith('Photo '))) {
                            // post media

                            if (!totalMedia.parentElement.querySelector('div.instagram-download-button')) {
                                totalMedia.insertAdjacentHTML('beforebegin', `
                                    <div class="instagram-download-button">
                                        <img src="${chrome.runtime.getURL('assets/download.png')}">
                                    </div>
                                `);

                                const button = totalMedia.parentElement.querySelector('div.instagram-download-button');
                                button.addEventListener('click', async function() {
                                    let post_id;

                                    const articleAs = article.querySelectorAll('a:has(div > time)');
                                    for (let articleA of articleAs) {
                                        if (articleA.href.startsWith(`${document.location.origin}/p/`) && !articleA.href.includes('liked_by')) {
                                            post_id = articleA.href.replace(`${document.location.origin}/p/`, '').replace('/', '');
                                        }
                                    }

                                    if (post_id) {
                                        let dots;
                                        let dotIndexSelected = 0;
                                        
                                        if (article.querySelectorAll('article > div > div').length == 2) {
                                            dots = article.querySelectorAll('article > div > div:nth-child(1) > div > div:nth-child(2) > div');
                                        } else {
                                            dots = article.querySelectorAll('article > div > div:nth-child(2) > div > div:nth-child(2) > div');
                                        }
                                        
                                        if (dots) {
                                            let maxClassedFound = -1;
                                            for (let i = 0; i < dots.length; i++) {
                                                if (maxClassedFound == -1 || maxClassedFound < dots[i].classList.length) {
                                                    maxClassedFound = dots[i].classList.length;
                                                    dotIndexSelected = i;
                                                }
                                            }
                                        }

                                        downloadPostMedia(post_id, dotIndexSelected);
                                    }
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    async function downloadProfileMedia(username) {
        const fetchProfileRequest = await fetch(`https://www.instagram.com/${username}/?__a=1&__d=dis`);
        const fetchProfileResponse = await fetchProfileRequest.json();
        
        const downloadUrl = fetchProfileResponse.graphql.user.profile_pic_url_hd || fetchProfileResponse.graphql.user.profile_pic_url;

        const url = new URL(downloadUrl);

        const urlSlashSplitted = url.pathname.split('/');
        const originalFileName = urlSlashSplitted.pop();
        const urlDotSplitted = originalFileName.split('.');
        const fileType = urlDotSplitted.pop();
        const fileName = `${username}_${urlDotSplitted.pop()}`;

        downloadFile(downloadUrl, fileName, fileType);
    }

    async function downloadPostMedia(post_id, media_index) {
        const fetchRequest = await fetch(`https://www.instagram.com/graphql/query/?query_hash=55a3c4bad29e4e20c20ff4cdfd80f5b4&variables={"shortcode":"${post_id}"}`);
        const fetchResponse = await fetchRequest.json();
        if (fetchResponse.status === 'ok') {
            const username = fetchResponse.data.shortcode_media.owner.username;
            let downloadUrl;

            if (fetchResponse.data.shortcode_media.edge_sidecar_to_children) {
                const nodes = fetchResponse.data.shortcode_media.edge_sidecar_to_children.edges;
                if (nodes.length > 0) {
                    if (nodes[media_index].node.is_video != true) {
                        // TODO: select biggest resolution and not the last one
                        downloadUrl = nodes[media_index].node.display_resources[nodes[media_index].node.display_resources.length - 1].src;
                    } else {
                        downloadUrl = nodes[media_index].node.video_url;
                    }
                }
            } else {
                if (fetchResponse.data.shortcode_media.is_video != true) {
                    // TODO: select biggest resolution and not the last one
                    downloadUrl = fetchResponse.data.shortcode_media.display_resources[fetchResponse.data.shortcode_media.display_resources.length - 1].src;
                } else {
                    downloadUrl = fetchResponse.data.shortcode_media.video_url;
                }
            }

            const url = new URL(downloadUrl);
            const urlSlashSplitted = url.pathname.split('/');
            const originalFileName = urlSlashSplitted.pop();
            const urlDotSplitted = originalFileName.split('.');
            const fileType = urlDotSplitted.pop();
            const fileName = `${username}_${urlDotSplitted.pop()}`;

            downloadFile(downloadUrl, fileName, fileType);
        }
    }

    async function downloadStoryMedia(username, media_index) {
        const fetchProfileRequest = await fetch(`https://www.instagram.com/${username}/?__a=1&__d=dis`);
        const fetchProfileResponse = await fetchProfileRequest.json();
        
        const user_id = fetchProfileResponse.graphql.user.id;

        const fetchRequest = await fetch(`https://www.instagram.com/graphql/query/?query_hash=90709b530ea0969f002c86a89b4f2b8d&variables={"reel_ids":["${user_id}"],"location_ids":[],"precomposed_overlay":false}`);
        const fetchResponse = await fetchRequest.json();
        if (fetchResponse.status === 'ok') {
            let downloadUrl;
            
            const story = fetchResponse.data.reels_media[0].items[media_index];
            if (story.is_video != true) {
                // TODO: select biggest resolution and not the last one
                downloadUrl = story.display_resources[story.display_resources.length - 1].src;
            } else {
                // TODO: select biggest resolution and not the last one
                downloadUrl = story.video_resources[story.video_resources.length - 1].src;
            }

            const url = new URL(downloadUrl);

            const urlSlashSplitted = url.pathname.split('/');
            const originalFileName = urlSlashSplitted.pop();
            const urlDotSplitted = originalFileName.split('.');
            const fileType = urlDotSplitted.pop();
            const fileName = `${username}_${urlDotSplitted.pop()}`;

            downloadFile(downloadUrl, fileName, fileType);
        }
    }

    async function downloadHighlightStoryMedia(username, highlight_id, media_index) {
        const fetchRequest = await fetch(`https://www.instagram.com/graphql/query/?query_hash=45246d3fe16ccc6577e0bd297a5db1ab&variables={"highlight_reel_ids":["${highlight_id}"],"location_ids":[],"precomposed_overlay":false}`);
        const fetchResponse = await fetchRequest.json();
        if (fetchResponse.status === 'ok') {
            let downloadUrl;
            
            const items = fetchResponse.data.reels_media[0].items;
            const story = items[items.length - 1 - media_index];
            if (story.is_video != true) {
                // TODO: select biggest resolution and not the last one
                downloadUrl = story.display_resources[story.display_resources.length - 1].src;
            } else {
                // TODO: select biggest resolution and not the last one
                downloadUrl = story.video_resources[story.video_resources.length - 1].src;
            }

            const url = new URL(downloadUrl);

            const urlSlashSplitted = url.pathname.split('/');
            const originalFileName = urlSlashSplitted.pop();
            const urlDotSplitted = originalFileName.split('.');
            const fileType = urlDotSplitted.pop();
            const fileName = `${username}_${urlDotSplitted.pop()}`;

            downloadFile(downloadUrl, fileName, fileType);
        }
    }
})();