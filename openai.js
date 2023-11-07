import { credentials } from "./env.js";
import * as cf from "./chromeFunctions.js";

const p = document.querySelector('#prompt');
const t = document.querySelector('#thinking');

export async function newMessage(prompt){
    const tabData = await cf.getTabData();
    const userResponse = `Here is the data about tabs:\n${JSON.stringify(tabData)}\
                          The user lives in Seattle and travels with their partner.
                          The user's next vacation is Dec 22 to Jan 1
                          The user is interested in AI, dogs, sci-fi.
                          The user is dairy free and egg free.
                          The user has asked: "${prompt}"`
    return [
    {"role": "system", "content": "Respond with a message or function call. Multiple function calls in a row allowed"},
    {"role": "user", "content": userResponse},
    ]
}

export async function getResponse(messages) {
    t.hidden = false;   
    console.log(messages);

    const functions = [
        {
            name: "search",
            description: "Searches the internet",
            parameters: {
                type: "object",
                properties: {
                    keywords: {
                        type: "string",
                        description: "Keywords to use in the search. Feel free to re-write based on what you know about the users preferences",
                    },
                    type: {
                        type: "string",
                        enum: ["general", "places", "hotels"],
                        description: "Use places type for local places searches like restaurants, attractions, etc. Use hotels for airbnb, hotel, place to stay."

                    }
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
        {
            name: "tabClose",
            description: "Closes tabs",
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
                },
                required: ["tabIdArray"],
            },
        },
        {
            name: "tabBookmark",
            description: "Create a bookmark for a tab with better title. Save pages for later.",
            parameters: {
                type: "object",
                properties: {
                    tabId: {
                        type: "integer",
                        description: "id of tab to create bookmark from",                       
                    },
                    name: {
                        type: "string",
                        description: "Concise name for bookmark based on tab title. Don't append words like article, blog, site name"
                    }
                },
                required: ["tabId", "name"],
            },
        },
    ];

    const url = "https://api.openai.com/v1/chat/completions";
    const data = {
        "model": 'gpt-4-1106-preview',
        "messages": messages,
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
        .then(d => handleResponse(d, messages))
}

export async function handleResponse(input, messages) {
    const assistant_message =input["choices"][0]["message"];
    messages.push(assistant_message);

    const d = document.querySelector('#data');
    d.innerHTML = [...messages].map(m => '<p>' + JSON.stringify(m) + '</p>').join('');

    if (assistant_message.content){
        messages.push({"role": "assistant", 
        "content": assistant_message.content});
    }

    const data = assistant_message.function_call;
    const functionName = data.name;
    const functionArgs = JSON.parse(data.arguments);

    if (functionName === 'tabGroup') {
        console.log('grouping');
        cf.tabGroup(functionArgs);
        messages.push({"role": "function", 
            "content": `Successfully created ${functionArgs.groupName} tab group. No more action needed.`, 
            "name": assistant_message["function_call"]["name"]})
        getResponse(messages);
    }
    if (functionName === 'tabBookmark'){
        console.log('bookmarking');
        cf.tabBookmark(functionArgs);
        messages.push({"role": "function", 
            "content": `Successfully created bookmark ${functionArgs.name}.`, 
            "name": assistant_message["function_call"]["name"]})
        getResponse(messages);
    }
    if (functionName === 'tabClose') {
        console.log('closing');
        cf.tabClose(functionArgs);
        messages.push({"role": "function", 
            "content": `Successfully closed tabs. No more action needed.`, 
            "name": assistant_message["function_call"]["name"]})
        getResponse(messages);
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
        const createdTabs = await cf.search(functionArgs);
        
        messages.push({"role": "function", 
            "content": `Successfully searched. Please group the additional tabs: ${JSON.stringify(createdTabs)}`, 
            "name": assistant_message["function_call"]["name"]})
        getResponse(messages)
    }
    t.hidden = true;
    p.innerText = '';
}

