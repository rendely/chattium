import { credentials } from "./env.js";
import * as cf from "./chromeFunctions.js";

const p = document.querySelector('#prompt');
const t = document.querySelector('#thinking');

export async function getResponse(prompt) {
    t.hidden = false;
    const tabData = await cf.getTabData();
    console.log(prompt, tabData);

    const systemPrompt = `Only respond with a function call that meets the user request. Multiple function calls in a row allowed`
    const functions = [
        {
            name: "search",
            description: "Searches the internet",
            parameters: {
                type: "object",
                properties: {
                    keywords: {
                        type: "string",
                        description: "Keywords to use in the search",
                    },
                },
                required: ["keywords"],
            },
        },
        {
            name: "tabGroup",
            description: "Create a new group of tabs",
            parameters: {
                type: "object",
                properties: {
                    tabIdArray: {
                        type: "array",
                        description: "Array of tab id integers",
                        items: {
                            type: "integer"
                        }
                    },
                    groupName: {
                        type: "string",
                        description: "The name of the group, try to use an emoji and keep it concise. Don't use word 'Tabs'",
                    },
                },
                required: ["tabIdArray", "groupName"],
            },
        },
    ];
    
    const userPrompt = `Here is the data about tabs:

${JSON.stringify(tabData)}

The user has asked: "${prompt}"
`

    console.log(systemPrompt);
    console.log(userPrompt);

    const url = "https://api.openai.com/v1/chat/completions";
    const data = {
        "model": 'gpt-3.5-turbo',
        "messages": [
            {
                "role": "system",
                "content": systemPrompt
            },
            {
                "role": "user",
                "content": userPrompt
            }
        ],
        functions: functions,
        function_call: 'auto'
    }

    const headers = {
        "Content-Type": "application/json",
        Authorization: credentials,
    };

    fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data)
    })
        .then(r => r.json())
        .then(d => handleResponse(d))
}

export function handleResponse(input) {
    console.log(input);
    const data = input.choices[0].message.function_call;
    console.log(data);
    const d = document.querySelector('#data');
    d.innerHTML += '<p>' + JSON.stringify(data) + '</p>';
    const functionName = data.name;
    const functionArgs = JSON.parse(data.arguments);
    if (functionName === 'tabGroup') {
        console.log('grouping');
        cf.tabGroup(functionArgs)
    }
    if (functionName === 'tabClose') {
        console.log('closing');
        cf.tabClose(data.tabIdArray);
    }
    if (functionName === 'tabCreate') {
        console.log('opening');
        cf.tabCreate(data.url);
    }
    if (functionName === 'tabMove') {
        console.log('moving');
        cf.tabMove(data.tabId, data.index);
    }
    if (functionName === 'search') {
        console.log('searching');
        cf.search(functionArgs);
    }
    if (functionName === 'getResponse') {

        window.setTimeout(() => {
            console.log('prompting delay');
            getResponse(data.prompt)
        }, [1000])
    }
    t.hidden = true;
    p.innerText = '';
}

