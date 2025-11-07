// This module simulates a file system within localStorage.
// All data is stored in a single localStorage key as a large JSON object
// that mimics a file/directory structure.

const VFS_KEY = 'larys_house_virtual_file_system';

interface VirtualFileSystem {
  [path: string]: string; // path -> file content (stringified JSON or base64 data)
}

let vfs: VirtualFileSystem = {};

// Load the file system from localStorage on startup
const loadVfs = () => {
  try {
    const storedVfs = localStorage.getItem(VFS_KEY);
    if (storedVfs) {
      vfs = JSON.parse(storedVfs);
    } else {
      vfs = {};
    }
  } catch (error) {
    console.error("Failed to load virtual file system from localStorage", error);
    vfs = {};
  }
};

// Save the entire file system to localStorage
const saveVfs = () => {
  try {
    const vfsString = JSON.stringify(vfs);
    localStorage.setItem(VFS_KEY, vfsString);
  } catch (error) {
    console.error("Failed to save virtual file system to localStorage", error);
    // This can happen if the data contains circular references or is too large.
  }
};

// Initialize the file system. If a file path doesn't exist, it's created with the default content.
export const initializeFileSystem = (defaultStructure: Record<string, any>) => {
    loadVfs();
    let updated = false;
    for (const path in defaultStructure) {
        if (vfs[path] === undefined) {
            console.log(`Initializing virtual file: ${path}`);
            // Always stringify the content to ensure it's a valid JSON representation.
            vfs[path] = JSON.stringify(defaultStructure[path]);
            updated = true;
        }
    }
    if (updated) {
        saveVfs();
    }
};

// --- Public API ---

export const readJsonFile = <T>(path: string): T => {
  const fileContent = vfs[path];
  if (fileContent === undefined) {
    throw new Error(`Virtual file not found at path: ${path}`);
  }
  try {
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Failed to parse JSON from virtual file: ${path}`, error);
    throw error;
  }
};

export const writeJsonFile = (path: string, data: any): void => {
  vfs[path] = JSON.stringify(data, null, 2);
  saveVfs();
};

export const readImage = (path: string): string | null => {
    return vfs[path] || null;
}

export const writeImage = (path: string, base64Data: string): void => {
    vfs[path] = base64Data;
    saveVfs();
}

export const deleteFile = (path: string): void => {
    if (vfs[path] !== undefined) {
        delete vfs[path];
        saveVfs();
    }
}