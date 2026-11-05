import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShoppingList, ShoppingListItem } from '../types';

const LOCAL_STORAGE_KEY = 'dellychow_shopping_lists';

function getLocalLists(userId: string): ShoppingList[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Local shopping lists read notice:', e);
  }
  return [];
}

function setLocalLists(userId: string, lists: ShoppingList[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${userId}`, JSON.stringify(lists));
  } catch (e) {
    console.warn('Local shopping lists write notice:', e);
  }
}

export const ShoppingService = {
  // Listen to user's shopping lists
  listenToShoppingLists(userId: string, callback: (lists: ShoppingList[]) => void): () => void {
    if (!userId) {
      callback([]);
      return () => {};
    }

    // Initialize with local cache first
    const cached = getLocalLists(userId);
    if (cached.length > 0) {
      callback(cached);
    }

    // Try listening to Firestore
    try {
      const userListsRef = collection(db, 'users', userId, 'shopping_lists');
      const unsubscribe = onSnapshot(userListsRef, (snapshot) => {
        const items: ShoppingList[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...(docSnap.data() as Omit<ShoppingList, 'id'>) });
        });
        items.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
        setLocalLists(userId, items);
        callback(items);
      }, (err) => {
        console.warn('Firestore shopping lists listener notice:', err);
        callback(getLocalLists(userId));
      });

      return unsubscribe;
    } catch (e) {
      console.warn('Firestore shopping lists init notice:', e);
      callback(getLocalLists(userId));
      return () => {};
    }
  },

  // Save new or existing list
  async saveShoppingList(userId: string, list: ShoppingList): Promise<string> {
    const listId = list.id || `list_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullList: ShoppingList = {
      ...list,
      id: listId,
      userId,
      updatedAt: new Date().toISOString()
    };

    // Update local cache
    const current = getLocalLists(userId);
    const existingIndex = current.findIndex(l => l.id === listId);
    if (existingIndex >= 0) {
      current[existingIndex] = fullList;
    } else {
      current.unshift(fullList);
    }
    setLocalLists(userId, current);

    // Persist to Firestore
    try {
      const docRef = doc(db, 'users', userId, 'shopping_lists', listId);
      await setDoc(docRef, fullList);
    } catch (err) {
      console.warn('Firestore shopping list save notice, preserved in local storage:', err);
    }

    return listId;
  },

  // Delete list
  async deleteShoppingList(userId: string, listId: string): Promise<ShoppingList | null> {
    const current = getLocalLists(userId);
    const deleted = current.find(l => l.id === listId) || null;
    const remaining = current.filter(l => l.id !== listId);
    setLocalLists(userId, remaining);

    try {
      const docRef = doc(db, 'users', userId, 'shopping_lists', listId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore shopping list delete notice:', err);
    }

    return deleted;
  },

  // Update item purchased status or contents
  async updateListItems(userId: string, listId: string, items: ShoppingListItem[]): Promise<void> {
    const current = getLocalLists(userId);
    const list = current.find(l => l.id === listId);
    if (list) {
      list.items = items;
      list.updatedAt = new Date().toISOString();
      setLocalLists(userId, current);
    }

    try {
      const docRef = doc(db, 'users', userId, 'shopping_lists', listId);
      await updateDoc(docRef, {
        items,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Firestore list items update notice:', err);
    }
  },

  // Duplicate an existing shopping list
  async duplicateList(userId: string, sourceList: ShoppingList): Promise<ShoppingList> {
    const newId = `list_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const duplicated: ShoppingList = {
      ...sourceList,
      id: newId,
      name: `${sourceList.name} (Copy)`,
      items: sourceList.items.map(item => ({
        ...item,
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        purchased: false // Reset purchased on duplicate
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.saveShoppingList(userId, duplicated);
    return duplicated;
  }
};
