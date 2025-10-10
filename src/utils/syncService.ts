
const channel = new BroadcastChannel('hmap-project-sync');

export const subscribeToUpdates = (callback: () => void) => {
    const handler = (event: MessageEvent) => {
        if (event.data === 'update') {
            callback();
        }
    };
    channel.addEventListener('message', handler);
    return () => channel.removeEventListener('message', handler);
};

export const notifyUpdate = () => {
    channel.postMessage('update');
};
