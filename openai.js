import { credentials } from "./env.js";
import * as cf from "./chromeFunctions.js";

const p = document.querySelector('#prompt');
const t = document.querySelector('#thinking');

export async function newMessage(prompt){
    const tabData = await cf.getTabData();
    const tabGroupData = await cf.getExistingGroups();
    console.table(tabData);
    console.table(tabGroupData);
    const userResponse = `
Here is the data about tabs:\n${JSON.stringify(tabData)}
Here is the data about existing tab groups:\n${JSON.stringify(tabGroupData)}
Here is data about the user:
- The user lives in Seattle and travels with their partner.
- The user's next vacation is Dec 22 to Jan 1
- The user is interested in AI, dogs, sci-fi, snorkeling.
- The user has dietary requirements: dairy free and egg free.
- The user has recently looked at hiking: 
1. Rattlesnake Ledge (Snoqualmie Pass)
Start: I-90 Exit 32 (map)
Difficulty: Easy
Length: 4 miles roundtrip
https://www.google.com/maps/dir//47.4335,-121.7675/@47.4295313,-121.8061256,12z/data=!4m4!4m3!1m0!1m1!4e1?hl=en

Do not ask for follow up, just call functions and respond when done to summarize actions taken.
The user has asked: "${prompt}"
First plan out your steps, then call functions
`
    return [
    {"role": "system", "content": "Respond with a message or function call. Multiple function calls in a row allowed"},
    {"role": "user", "content": userResponse},
    ]
}

export async function getResponse(messages, planning=false, model='gpt-3.5-turbo') {
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
            description: "Create a new group of tabs or assign tabs to an existing group if a relevant one already exists",
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
                        description: "The name of the group, try to use an emoji and keep it concise. Don't use word 'Tabs'. Only required if creating a new group.",
                    },
                    groupId: {
                        type: "integer",
                        description: "Group id of an existing group in case it's better to combine the tabs into an existing group"
                    }
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
        // https://platform.openai.com/docs/models
        "model": model,
        "messages": messages,
        functions: functions,
        function_call: planning ? 'none' : 'auto'
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
    const d = document.querySelector('#data');

    if (input['error']){
        d.innerHTML = input.error.message;
        return;
    }

    const assistant_message =input["choices"][0]["message"];
    messages.push(assistant_message);

    if (messages.length === 3){
        messages.push( {"role": "user", "content": "Sounds great! Go ahead"});
        getResponse(messages);

    }
    
    d.innerHTML = [...messages].map(m => '<p>' + JSON.stringify(m) + '</p>').join('');

    const data = assistant_message.function_call;
    const functionName = data.name;
    const functionArgs = JSON.parse(data.arguments);

    if (functionName === 'tabGroup') {
        console.log('grouping');
        const resultMessage = await cf.tabGroup(functionArgs);
        messages.push({"role": "function", 
            "content": resultMessage,
            "name": assistant_message["function_call"]["name"]})
        getResponse(messages);
    }
    if (functionName === 'tabBookmark'){
        console.log('bookmarking');
        await cf.tabBookmark(functionArgs);
        messages.push({"role": "function", 
            "content": `Successfully created bookmark ${functionArgs.name}.`, 
            "name": assistant_message["function_call"]["name"]})
        getResponse(messages);
    }
    if (functionName === 'tabClose') {
        console.log('closing');
        await cf.tabClose(functionArgs);
        messages.push({"role": "function", 
            "content": `Successfully closed tabs.`, 
            "name": assistant_message["function_call"]["name"]})
        getResponse(messages);
    }
    if (functionName === 'tabCreate') {
        console.log('opening');
        await cf.tabCreate(functionArgs);
        messages.push({"role": "function", 
        "content": `Successfully created tab for ${functionArgsurl}.`, 
        "name": assistant_message["function_call"]["name"]})
    getResponse(messages);
    }
    if (functionName === 'tabMove') {
        console.log('moving');
        await cf.tabMove(data.tabId, data.index);
    }
    if (functionName === 'search') {
        console.log('searching');
        const createdTabs = await cf.search(functionArgs);
        
        messages.push({"role": "function", 
            "content": `Successfully searched. Please group the additional tabs in their own unique group: ${JSON.stringify(createdTabs)}`, 
            "name": assistant_message["function_call"]["name"]})
        getResponse(messages)
    }
    t.hidden = true;
    p.innerText = '';
}

