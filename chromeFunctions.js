
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

export async function tabMove({tabId, index}){
  chrome.tabs.move(tabId, {index: index});
}

export async function search({ keywords }) {

  const searchTab = await tabCreate(`https://search.brave.com/search?q=${encodeURIComponent(keywords)}`);
  await new Promise(resolve => setTimeout(resolve, 2000)); // You may need a more reliable way to wait for the page to load
  const urls = await extractURLsFromSearchPage(searchTab.id);
  chrome.tabs.remove(searchTab.id);

  const tabIds = await Promise.all(urls.map(async (url) => {
    const tab = await tabCreate(url);
    return tab.id;
  }));

  const tabsData = await Promise.all(tabIds.map(async (tabId) => {
    return await chrome.tabs.get(tabId);
  }));

  return tabsData.map(t => ({id: t.id, title: t.title}));
}

async function extractURLsFromSearchPage(tabId) {
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
  return new Promise(resolve => {
    chrome.tabs.create({ url: url }, function (tab) {
      resolve(tab);
    });
  });
}
