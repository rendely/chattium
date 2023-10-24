const d = document.querySelector('#data');
const p = document.querySelector('#prompt');
const form = document.querySelector('#form');
form.addEventListener('submit', handleSubmit);

async function handleSubmit(e){
    e.preventDefault();
    const prompt = p.value;
    tabData = await getTabData();
    getResponse(prompt, tabData);
}

async function getTabData(){
    const tabs = await chrome.tabs.query({});
    const tabData = tabs.map(t => {
        // d.innerHTML += t.url+'</br>';
        return {id:t.id, title:t.title, url:t.url}
    });
    return tabData;
}




async function tabGroup(tabIdArray, groupName){
    const g = await chrome.tabs.group({tabIds: tabIdArray});
    chrome.tabGroups.update(g,{title: groupName});
}


function getResponse(prompt, tabData){
    console.log(prompt, tabData);

    const systemPrompt = `Your task is to respond with a single function call in the exact format specified below. Only respond with the action and no other chat before or after. 
    Your options include:
    Close:
    tabClose(tabIdArray)
    Group:
    tabGroup(tabIdArray, groupName)

    Example:
    User input: "Close all tabs about travel"
    Output: "tabClose([2,4])
    `

    const userPrompt = `Here is the data about tabs:

    ${JSON.stringify(tabData)}

    The user has asked: "${prompt}"

    Please respond with your action function call:
    `

    console.log(userPrompt);

    const url = "https://api.openai.com/v1/chat/completions";
    const data = {
      "model": 'gpt-4',
      "messages":  [
        {
          "role": "system",
          "content": systemPrompt
        },
        {
          "role": "user",
          "content": userPrompt
        }
      ],
    }

    const headers = {
        "Content-Type": "application/json",
        Authorization: 'Bearer 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',
      };
    
    fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data)
    })
    .then(r => r.json())    
    .then(d => d.choices[0].message.content)
    .then(message => handleResponse(message))
}

function handleResponse(input){
    console.log(input);
    if (input.match('tabGroup')){
        const tabIds = JSON.parse(input.match(/\[[^\]]+\]/));
        const title = input.match(/"([^"]+)"/)[1];
        console.log(tabIds, title);
        tabGroup(tabIds, title);
    }
}

// getResponse(userPrompt);