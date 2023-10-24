import { credentials } from "./env.js";

const d = document.querySelector('#data');
const p = document.querySelector('#prompt');
const form = document.querySelector('#form');
const t = document.querySelector('#thinking');
form.addEventListener('submit', handleSubmit);

async function handleSubmit(e){
    e.preventDefault();
    t.hidden=false;
    const prompt = p.value;
    const tabData = await getTabData();
    getResponse(prompt, tabData);    
}

async function getTabData(){
    const tabs = await chrome.tabs.query({});
    const tabData = tabs.map(t => {
        // d.innerHTML += t.url+'</br>';
        return {id:t.id, title:t.title, url:t.url.slice(0,t.url.indexOf('?'))}
    });
    return tabData;
}

async function tabGroup(tabIdArray, groupName){
    const g = await chrome.tabs.group({tabIds: tabIdArray});
    chrome.tabGroups.update(g,{title: groupName, collapsed: true});
}

async function tabClose(tabIdArray){
  chrome.tabs.remove(tabIdArray);
}

async function tabCreate(url){
  chrome.tabs.create({url:url});
}

async function search(keywords){
  tabCreate(`https://search.brave.com/search?q=${encodeURIComponent(keywords)}`);
  runScript();
}

async function tabMove(tabId, index){
  chrome.tabs.move(tabId, {index: index});
}

async function runScript(scriptString) {

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var activeTab = tabs[0];
    if (activeTab) {
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          func: () => {
            const a = document.querySelectorAll('main  a');
            const urls = Array.from(a).map(h => h.href).filter(u => !u.match('brave.com'));
            chrome.runtime.sendMessage({greeting: "hello"});
            urls.slice(0,10).map(a => window.open(a.href,"_blank"));
          }
      });
    }
  });
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
    if (request.greeting === "hello")
      console.log('bye');
  }
);

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
    Move/reorder:
    tabMove(tabId, index)
    Search/Open/Find:
    search(keywords)
    
    Example:
    User input: 
    "Close all tabs about travel"
    Output: 
    [{"functionName": "tabClose", "tabIdArray":[2,3]}]

    Example:
    User input:
    "Open tabs about tech from reddit"
    Output:
    [{"functionName": "search", "keywords":"tech technology reddit"}]

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
      if (d.functionName === 'tabMove'){
        console.log('moving');
        tabMove(d.tabId, d.index);
      }
      if (d.functionName === 'search'){
        console.log('searching');
        search(d.keywords);
      }
    t.hidden=true;
    p.innerText = '';
    });
}

