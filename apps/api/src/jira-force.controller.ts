if (format === 'csv') {
    const csvData = results.length > 0 ? parse(results) : ''; // Handle empty results
    return {
        headers: { 'Content-Type': 'text/csv' },
        body: csvData,
    };
}