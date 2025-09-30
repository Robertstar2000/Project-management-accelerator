export const logAction = (action: string, element: string, details: any) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      element,
      // Deep copy state to log its value at this point in time
      state: JSON.parse(JSON.stringify(details)),
    };
    console.log('HMAP_LOG:', logEntry);
  } catch (error) {
    console.error('Error during logging:', error, { action, element, details });
  }
};
