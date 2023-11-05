
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

export async function tabClose({tabIdArray}){
  chrome.tabs.remove(tabIdArray);
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


export async function search({ keywords }) {
  // Open the search results tab
  const searchTab = await tabCreate(`https://search.brave.com/search?q=${encodeURIComponent(keywords)}`);

  // Wait for the search results to load
  await new Promise(resolve => setTimeout(resolve, 2000)); // You may need a more reliable way to wait for the page to load

  // Extract the URLs from the search results
  const urls = await extractURLsFromSearchPage(searchTab.id);

  chrome.tabs.remove(searchTab.id);

  // Create new tabs for the URLs and collect their tab IDs
  const tabIds = await Promise.all(urls.map(async (url) => {
    const tab = await tabCreate(url);
    return tab.id;
  }));

  // Query each new tab for its data
  const tabsData = await Promise.all(tabIds.map(async (tabId) => {
    return await chrome.tabs.get(tabId);
  }));

  // Return the array of tab data
  return tabsData.map(t => ({id: t.id, title: t.title}));
}

async function extractURLsFromSearchPage(tabId) {
  // This function will execute a script in the search results tab to extract the URLs
  // You may need to adjust the selector according to the actual page structure of the search results
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      const links = document.querySelectorAll('div[data-type="web"] > a');
      return Array.from(links).map(link => link.href).filter(u => !u.match('brave.com')).slice(0,4);
    },
  });
  return result.result;
}


async function tabCreate(url) {
  // This function should create a tab and return its data
  return new Promise(resolve => {
    chrome.tabs.create({ url: url }, function (tab) {
      resolve(tab);
    });
  });
}
