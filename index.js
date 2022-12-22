const DevToolsClient = require('devtools-client');
const Controller = new DevToolsClient();
const puppeteer = require('puppeteer');

const config = require('./config.json');

let lastname = '';
fetch('http://127.0.0.1:8315/json/list').then((res) => res.json()).then((json) => {
    const debuggerURL = json.find(item => item.title === 'WhatsApp Desktop').webSocketDebuggerUrl;
    console.log('Found debugger url', debuggerURL);
    attachToDebugger(debuggerURL);
});

function attachToDebugger(debuggerURL) {
    Controller.connect({
        nodeWSEndpoint: debuggerURL
    }).then(async ({ Debugger, Runtime, Profiler }) => {
        const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
        const page = await browser.newPage();
        setInterval(() => update(page, Runtime), 1000);
    }, (err) => {
        console.log('Error', err);
        console.log('Please check if whatsapp is running. You can start it with', 'open /Applications/WhatsApp.app --args --remote-debugging-port=8315')
    });
}

async function update(page, Runtime) {
    if (page !== undefined && page.url() === config.base_url) {
        await page.$eval('#email', (el, value) => el.value = value, config.username);
        await page.$eval('#password', (el, value) => el.value = value, config.password);
        await page.$eval('body > div > div > div > div > form > div.form-group.actions > button', el => el.click());
    }
    Runtime.evaluate({
        expression: `document.querySelector('[data-testid="conversation-info-header-chat-title"]').innerText`
    }).then(async (result) => {
        const name = result.result.value;
        if (name !== lastname) {
            const url = await getContactURL(name);
            page.goto(url);
            lastname = name;
        }
    });
}

function getContactURL(contactname) {
    return new Promise((resolve) => {
        fetch(config.base_url + 'api/contacts?query=' + contactname, {
            headers: {
                Authorization: 'Bearer ' + config.token
            }
        }).then((res) => res.json()).then((json) => {
            const contact = json.data.find(item => item.complete_name === contactname);
            if (contact === undefined) {
                resolve(lasturl);
            } else {
                resolve(config.base_url + 'people/' + contact.hash_id);
            }
        });
    });
}