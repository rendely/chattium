
export async function getTabData(){
    const tabs = await chrome.tabs.query({});
    const tabData = tabs.map(t => {
        // d.innerHTML += t.url+'</br>';
        return {id:t.id, 
          title:t.title
          // , url:t.url.slice(0,t.url.indexOf('?'))
        }
    });
    return tabData;
}

export async function tabGroup({tabIdArray, groupName}){
    const g = await chrome.tabs.group({tabIds: tabIdArray});
    chrome.tabGroups.update(g,{title: groupName, collapsed: true});
}

export async function tabClose(tabIdArray){
  chrome.tabs.remove(tabIdArray);
}

export async function tabCreate(url){
  chrome.tabs.create({url:url});
}

export async function search({keywords}){
  tabCreate(`https://search.brave.com/search?q=${encodeURIComponent(keywords)}`);
  openBraveResults();
}

export async function tabMove(tabId, index){
  chrome.tabs.move(tabId, {index: index});
}

async function openBraveResults() {

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var activeTab = tabs[0];
    if (activeTab) {
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          func: () => {
            const a = document.querySelectorAll('div[data-type="web"] > a')
            const urls = Array.from(a).map(h => h.href).filter(u => !u.match('brave.com'));
            chrome.runtime.sendMessage({action: "open_tabs", urls: urls.slice(0,8)});
            // urls.slice(0,10).map(a => window.open(a.href,"_blank"));
          }
      });
    }
  });
}


chrome.runtime.onMessage.addListener(
  function(request, sender) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
    if (request.action === "open_tabs")
      request.urls.map(url => tabCreate(url))
  }
);