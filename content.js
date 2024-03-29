(() => {
    // https://www.instagram.com/${username}/?__a=1&__d=dis
    // https://www.instagram.com/graphql/query/?query_hash=55a3c4bad29e4e20c20ff4cdfd80f5b4&variables={"shortcode":"${post_id}"}
    // https://www.instagram.com/graphql/query/?query_hash=90709b530ea0969f002c86a89b4f2b8d&variables={"reel_ids":["${user_id}"],"location_ids":[],"precomposed_overlay":false}
    // https://www.instagram.com/graphql/query/?query_hash=45246d3fe16ccc6577e0bd297a5db1ab&variables={"highlight_reel_ids":["${highlight_id}"],"location_ids":[],"precomposed_overlay":false}

    const cooldownTimer = 250;
    let lastTimeFired = Date.now();

    let lastWindowHref;

    async function downloadFile(fileSrc, fileName, fileType) {
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

        if (fileType === 'jpg' || fileType === 'jpeg' || fileType === 'png' || fileType === 'webp' || fileType === 'heic') {
            // file is image

            fileName = `${fileName}.${fileType}`;
            download(fileSrc);
        } else if (fileType === 'mp4') {
            // file is video

            fileName = `${fileName}.${fileType}`;
            download(fileSrc);
        } else {
            console.error('Unknown file type', `.${fileType}`);
        }
    }
    
    function isExtensionImageSrc(src) {
        return src.startsWith('chrome-extension') || src.startsWith('moz-extension');
    }

    function getExtensionImageSrc(path) {
        return chrome.runtime.getURL(path) || browser.runtime.getURL(path);
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

    function unsetAllButtons() {
        document.querySelectorAll('.instagram-download-button').forEach((button) => {
            button.remove();
        });
    }

    async function setAllButtons() {
        if (lastWindowHref !== window.location.href) {
            unsetAllButtons();
            lastWindowHref = window.location.href;
        }

        const isStoriesPage = window.location.pathname.startsWith('/stories/');
        const isHighlightsPage = window.location.pathname.startsWith('/stories/highlights/');
        
        const isHomePage = window.location.pathname === '' || window.location.pathname === '/';
        const isPostPage = window.location.pathname.startsWith('/p/');

        if (isStoriesPage || isHighlightsPage) { // stories page && highlights page
            const articleImgs = document.querySelectorAll('section :not(header) img');
            const articleVideos = document.querySelectorAll('section :not(header) video');

            const totalMedias = [...articleImgs, ...articleVideos];

            for (let totalMedia of totalMedias) {
                const isMediaSrcValid = totalMedia.src && totalMedia.src !== '' && !isExtensionImageSrc(totalMedia.src);
                const isMediaCurrentSrcValid = totalMedia.currentSrc && totalMedia.currentSrc !== '' && !isExtensionImageSrc(totalMedia.currentSrc);
                if (isMediaSrcValid || isMediaCurrentSrcValid) {
                    const isMediaImg = totalMedia.tagName === 'IMG';
                    const isMediaVideo = totalMedia.tagName === 'VIDEO';

                    if (isMediaImg || isMediaVideo) {
                        if (isMediaImg && ((totalMedia.alt && totalMedia.alt.includes('\'s profile picture')) || totalMedia.parentElement.tagName === 'A')) {
                            continue;
                        } else {
                            if (!totalMedia.parentElement.querySelector('div.instagram-media-download-button')) {
                                totalMedia.insertAdjacentHTML('beforebegin', `
                                    <div class="instagram-download-button instagram-media-download-button">
                                        <img src="${getExtensionImageSrc('assets/download.png')}">
                                    </div>
                                `);
    
                                let header = document.querySelector('section header:has(a > img)');

                                let headerTimes = document.querySelectorAll('section time');

                                let headerTimeTempParentElement;
                                let headerTime;
                                for (let i = 0; i < headerTimes.length; i++) {
                                    let tempParentElement = headerTimes[i].parentElement;
                                    for (let j = 0; j < 10; j++) {
                                        if (tempParentElement.parentElement.querySelectorAll(':scope time').length == 1) {
                                            tempParentElement = tempParentElement.parentElement;
                                        }
                                    }
                                    
                                    if (!headerTime || tempParentElement.offsetHeight > headerTimeTempParentElement.offsetHeight) {
                                        headerTimeTempParentElement = tempParentElement;
                                        headerTime = headerTimes[i];
                                    }
                                }
                                
                                if (!header && headerTime) {
                                    let tempParentElement = headerTime;
                                    for (let i = 0; i < 10; i++) {
                                        tempParentElement = tempParentElement.parentElement;
                                        if (tempParentElement.querySelector('a > img')) {
                                            if (tempParentElement.querySelectorAll(':scope > div').length == 2) {
                                                header = tempParentElement;
                                                break;
                                            }
                                        }
                                    }
                                }
                                
                                if (header) {
                                    const button = totalMedia.parentElement.querySelector('div.instagram-media-download-button');
                                    button.style.top = `${header.offsetHeight + 150}px`;
                                    button.addEventListener('click', async function(event) {
                                        const dots = header.querySelectorAll(':scope > div:nth-child(1) > div');
                                        
                                        let dotWithMostChildren;
                                        let media_index;

                                        for (let i = 0; i < dots.length; i++) {
                                            if (!dotWithMostChildren || (dots[i].querySelectorAll('div').length >= dotWithMostChildren.querySelectorAll('div').length)) {
                                                dotWithMostChildren = dots[i];
                                                media_index = i;
                                            }
                                        }
                                        
                                        if (!isHighlightsPage) {
                                            const username = window.location.pathname.replaceAll('/stories/', '').split('/')[0];
                                            downloadStoryMedia(username, media_index);
                                        } else {
                                            const username = header.querySelector(':scope a:has(img)').href.replaceAll('https://www.instagram.com/', '').replaceAll('/', '');
                                            const highlight_id = window.location.pathname.replaceAll('/stories/highlights/', '').replaceAll('/', '');
                                            downloadHighlightStoryMedia(username, highlight_id, media_index);
                                        }
        
                                        event.stopPropagation();
                                    });
                                }
                            }
                        }
                    }
                }
            }
        } else if (isHomePage || isPostPage) { // home page
            let articleElements = document.querySelectorAll('article');
            
            const isPostModalOpen = isPostPage && articleElements.length !== 0;

            if (isPostPage && articleElements.length == 0) {
                articleElements = [
                    document.querySelector('main > div > div > div > div:nth-child(1)')
                ];
            }

            for (let articleElement of articleElements) {
                const articleImgs = articleElement.querySelectorAll('img');
                const articleVideos = articleElement.querySelectorAll('video');

                const totalArticleMedias = [...articleImgs, ...articleVideos];

                for (let totalArticleMedia of totalArticleMedias) {
                    const isArticleMediaSrcValid = totalArticleMedia.src && totalArticleMedia.src !== '' && !isExtensionImageSrc(totalArticleMedia.src);
                    const isArticleMediaCurrentSrcValid = totalArticleMedia.currentSrc && totalArticleMedia.currentSrc !== '' && !isExtensionImageSrc(totalArticleMedia.currentSrc);

                    if (isArticleMediaSrcValid || isArticleMediaCurrentSrcValid) {
                        const isArticleMediaImg = totalArticleMedia.tagName === 'IMG';
                        const isArticleMediaVideo = totalArticleMedia.tagName === 'VIDEO';

                        if (isArticleMediaImg || isArticleMediaVideo) {
                            if (isArticleMediaImg && (totalArticleMedia.alt && totalArticleMedia.alt.includes('\'s profile picture'))) {
                                continue;
                            } else {
                                if (totalArticleMedia.parentElement.querySelectorAll('div.instagram-media-download-button').length == 0) {
                                    totalArticleMedia.insertAdjacentHTML('beforebegin', `
                                        <div class="instagram-download-button instagram-media-download-button">
                                            <img src="${getExtensionImageSrc('assets/download.png')}">
                                        </div>
                                    `);

                                    const button = totalArticleMedia.parentElement.querySelector('div.instagram-media-download-button');
                                    if (button) {
                                        button.addEventListener('click', async function(event) {
                                            let post_id;
    
                                            if (isPostPage) {
                                                post_id = window.location.pathname.replaceAll('/p/', '').replaceAll('/', '');
                                            }
                                            
                                            if (!post_id) {
                                                const articleAs = articleElement.querySelectorAll('a');
                                                for (let articleA of articleAs) {
                                                    const linkStartString = `${document.location.origin}/p/`;
                                                    const linkEndString = '/liked_by/';
                                                    
                                                    if (articleA.href.startsWith(linkStartString) && articleA.href.endsWith(linkEndString)) {
                                                        post_id = articleA.href.replaceAll(linkStartString, '').replaceAll(linkEndString, '');
                                                        break;
                                                    }
                                                }
                                            }
    
                                            if (post_id) {
                                                let dots;
                                                let dotIndexSelected = 0;

                                                if (isPostPage && !isPostModalOpen) {
                                                    dots = articleElement.querySelectorAll(':scope > div > div > div > div > div > div:nth-child(2) > div');
                                                } else {
                                                    if (articleElement.querySelectorAll('article > div > div').length == 2) {
                                                        dots = articleElement.querySelectorAll('article > div > div:nth-child(1) > div > div:nth-child(2) > div');
                                                    } else {
                                                        dots = articleElement.querySelectorAll('article > div > div:nth-child(2) > div > div > div > div > div:nth-child(2) > div');
                                                    }
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
                                                event.stopPropagation();
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else { // profile page
            const headers = document.querySelectorAll('header');
            for (let header of headers) {
                const profileNameElement = header.querySelector('header > section > div h2');
                if (profileNameElement) {
                    const username = profileNameElement.innerHTML;
                    if (username === window.location.pathname.replaceAll('/', '')) {
                        // profile page
                        const headerImgs = header.querySelectorAll('img');
                        for (let headerImg of headerImgs) {
                            if (headerImg.alt && (headerImg.alt === `${username}'s profile picture` || headerImg.alt === `Profile photo`)) {
                                // profile picture
                                if (!headerImg.parentElement.parentElement.querySelector('div.instagram-profile-download-button')) {
                                    headerImg.parentElement.insertAdjacentHTML('beforebegin', `
                                        <div class="instagram-download-button instagram-profile-download-button">
                                            <img src="${getExtensionImageSrc('assets/download.png')}">
                                        </div>
                                    `);

                                    const button = headerImg.parentElement.parentElement.querySelector('div.instagram-profile-download-button');
                                    button.addEventListener('click', async function(event) {
                                        downloadProfileMedia(username);
                                        event.stopPropagation();
                                    });
                                }
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
            if (fetchResponse.data && fetchResponse.data.shortcode_media) {
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
