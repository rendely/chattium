import { credentials } from "./env.js";

const d = document.querySelector('#data');
const p = document.querySelector('#prompt');
const form = document.querySelector('#form');
form.addEventListener('submit', handleSubmit);

async function handleSubmit(e){
    e.preventDefault();
    const prompt = p.value;
    const tabData = await getTabData();
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

async function tabClose(tabIdArray){
  chrome.tabs.remove(tabIdArray);
}

async function tabCreate(url){
  chrome.tabs.create({url:url});
}

function getResponse(prompt, tabData){
    console.log(prompt, tabData);

    const systemPrompt = `Your task is to respond with a JSON object that has an array. Each array element has a function name and inputs. Only respond with the JSON object and no other chat before or after. 
    Your function options include:
    Close:
    tabClose(tabIdArray)
    Group:
    tabGroup(tabIdArray, groupName)
    Create:
    tabCreate(url)
    
    Example:
    User input: 
    "Close all tabs about travel"
    Output: 
    [{"functionName": "tabClose", "tabIdArray":[2,3]}]

    Example:
    User input: 
    "Group tabs about travel"
    Output: 
    [{"functionName": "tabGroup", "tabIdArray":[2,3], "groupName": "🏖Travel"}]
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
        Authorization: credentials,
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
    const data = JSON.parse(input);
    console.log(data);
    data.map(d => {
      if (d.functionName === 'tabGroup'){
        console.log('grouping');
        tabGroup(d.tabIdArray, d.groupName)
      }
      if (d.functionName === 'tabClose'){
        console.log('closing');
        tabClose(d.tabIdArray);
      }
      if (d.functionName === 'tabCreate'){
        console.log('opening');
        tabCreate(d.url);
      }
    });
    // console.log(input);
    // if (input.match('tabGroup')){
    //     const tabIds = JSON.parse(input.match(/\[[^\]]+\]/));
    //     const title = input.match(/"([^"]+)"/)[1];
    //     console.log(tabIds, title);
    //     tabGroup(tabIds, title);
    // }
}

// getResponse(userPrompt);