if (format === 'csv') {
    const csvData = results.length > 0 ? parse(results) : ''; // Handle empty results
    return {
        headers: { 'Content-Type': 'text/csv' },
        body: csvData,
    };
}

// Enhanced error handling
try {
    // existing logic
} catch (error) {
    console.error('Error in forceStart:', error);
    throw new BadRequestException('Invalid request parameters.');
}