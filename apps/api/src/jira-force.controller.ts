// Add this block at the end of the forceStart method
if (format === 'csv') {
    const csvData = parse(results); // Assuming results is an array of objects
    return {
        headers: { 'Content-Type': 'text/csv' },
        body: csvData,
    };
}