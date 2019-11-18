document.addEventListener('DOMContentLoaded', async () => {
    const consumer_key_msg = document.getElementById('consumer-key-msg');
    const consumer_secret_msg = document.getElementById('consumer-secret-msg');
    const save_button = document.getElementById('save-button');

    const keys = await browser.storage.local.get(['consumer_key', 'consumer_secret']);

    consumer_key_msg.value = keys.consumer_key !== undefined ? keys.consumer_key : '';
    consumer_secret_msg.value = keys.consumer_secret !== undefined ? keys.consumer_secret : '';

    save_button.addEventListener('click', async () => {
        const consumer_key = consumer_key_msg.value;
        const consumer_secret = consumer_secret_msg.value;
        if (consumer_key === '' || consumer_secret === '') {
            alert('Please enter your consumer key and consumer secret');
        } else {
            await browser.storage.local.set(
                {
                    'consumer_key': consumer_key,
                    'consumer_secret': consumer_secret
                });
            await browser.runtime.sendMessage({ 'action': 'setConsumerKey' });
            const tab = await browser.tabs.getCurrent();
            chrome.tabs.remove(tab.id);
        }
    });
});