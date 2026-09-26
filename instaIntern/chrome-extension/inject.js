(function() {
    // Intercept Fetch requests
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        const url = args[0] instanceof Request ? args[0].url : args[0];
        
        // We look for GraphQL or direct messaging endpoints where the hidden JSON lives
        if (typeof url === 'string' && (url.includes('graphql') || url.includes('direct_v2'))) {
            const clone = response.clone();
            clone.text().then(text => {
                try {
                    window.postMessage({
                        type: 'INSTA_INTERCEPT',
                        url: url,
                        data: text
                    }, '*');
                } catch (e) {}
            }).catch(e => {});
        }
        return response;
    };
    
    // Intercept XHR requests
    const OriginalXHR = window.XMLHttpRequest;
    function CustomXHR() {
        const xhr = new OriginalXHR();
        xhr.addEventListener('load', function() {
            if (xhr.responseURL && (xhr.responseURL.includes('graphql') || xhr.responseURL.includes('direct_v2'))) {
                try {
                    window.postMessage({
                        type: 'INSTA_INTERCEPT',
                        url: xhr.responseURL,
                        data: xhr.responseText
                    }, '*');
                } catch(e) {}
            }
        });
        return xhr;
    }
    window.XMLHttpRequest = CustomXHR;
    
    // --- BYPASS CHROME BACKGROUND THROTTLING ---
    // Instagram's React app checks document.visibilityState to pause videos and block clicks
    // We override these properties so it always thinks it is in the foreground!
    Object.defineProperty(document, 'visibilityState', {
        get: function() { return 'visible'; }
    });
    Object.defineProperty(document, 'hidden', {
        get: function() { return false; }
    });
    
    // Intercept visibilitychange events and destroy them so the React app never finds out
    window.addEventListener('visibilitychange', function(e) {
        e.stopImmediatePropagation();
    }, true);

})();
