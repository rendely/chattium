
export async function getTabData() {
  const tabs = await chrome.tabs.query({});
  const tabData = tabs.map(t => {
    // d.innerHTML += t.url+'</br>';
    return {
      id: t.id,
      host: new URL(t.url).host,
      title: t.title,
      groupId: (t.groupId > 0 ? t.groupId : undefined),
      active: (t.active ? true : undefined)
    }
  });
  return tabData;
}

export async function tabGroup({ tabIdArray, groupName, groupId }) {
  if (groupId >= 0){
    const g = await chrome.tabs.group({ tabIds: tabIdArray, groupId: groupId});
    return `Successfully added to tab group with groupId ${groupId}.` 
  }else{
    const g = await chrome.tabs.group({ tabIds: tabIdArray });
    chrome.tabGroups.update(g, { title: groupName, collapsed: true });
    return `Successfully create new tab group with group name ${groupName}.`
  }
}

export async function getExistingGroups() {
  const groups = await chrome.tabGroups.query({});
  return groups.map(g => ({
    groupTitle: g.title,
    groupId: g.id
  }));
}

export async function tabClose({ tabIdArray }) {
  chrome.tabs.remove(tabIdArray);
}

export async function tabMove({ tabId, index }) {
  chrome.tabs.move(tabId, { index: index });
}

export async function tabBookmark({ tabId, name }) {

  const tab = await chrome.tabs.get(tabId);
  console.log(tab);

  await chrome.bookmarks.create({ title: name, url: tab.url });
  chrome.tabs.remove(tab.id);
}

export async function search({ keywords, type }) {
  let URL = 'https://search.brave.com/search?q='
  if (type === 'places') {
    URL = 'https://www.google.com/maps/search/'
  }
  if (type === 'hotels') {
    URL = 'https://www.airbnb.com/s/homes?query='
  }
  const searchTab = await tabCreate({url:`${URL}${encodeURIComponent(keywords)}`});
  await new Promise(resolve => setTimeout(resolve, 2000)); // You may need a more reliable way to wait for the page to load
  const urls = await extractURLsFromSearchPage(searchTab.id);
  // chrome.tabs.remove(searchTab.id);

  const tabIds = await Promise.all(urls.map(async (url) => {
    const tab = await tabCreate({url});
    return tab.id;
  }));

  const tabsData = await Promise.all(tabIds.map(async (tabId) => {
    return await chrome.tabs.get(tabId);
  }));

  return [searchTab, ...tabsData].map(t => ({ id: t.id }));
}

export async function tabCreate({url}) {
  console.log(url);
  return new Promise(resolve => {
    chrome.tabs.create({ url: url }, function (tab) {
      resolve(tab);
    });
  });
}


async function extractURLsFromSearchPage(tabId) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      const links = document.querySelectorAll('div[data-type="web"] > a');
      return Array.from(links).map(link => link.href).filter(u => !u.match('brave.com')).slice(0, 4);
    },
  });
  return result.result;
}

