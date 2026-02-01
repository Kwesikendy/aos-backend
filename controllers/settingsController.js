// Settings Controller
// Handles reading and writing of system-wide settings to a JSON file
const fs = require('fs').promises;
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '../config/systemSettings.json');

// Helper to read settings
const readSettings = async () => {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, return defaults or handle error
        console.error('Error reading settings file:', error);
        return {};
    }
};

// Helper to write settings
const writeSettings = async (settings) => {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
};

/**
 * Get current system settings
 * @route GET /api/settings
 * @access Private (Admin)
 */
exports.getSettings = async (req, res) => {
    try {
        const settings = await readSettings();
        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching settings' });
    }
};

/**
 * Update system settings
 * @route PUT /api/settings
 * @access Private (Admin)
 */
exports.updateSettings = async (req, res) => {
    try {
        const newSettings = req.body;

        // In a real app, you might want to merge with existing to prevent overwriting missing keys
        // OR validate the structure strictly
        const currentSettings = await readSettings();
        const updatedSettings = { ...currentSettings, ...newSettings }; // Deep merge recommended in production, shallow for now

        await writeSettings(updatedSettings);

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            data: updatedSettings
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, message: 'Server error updating settings' });
    }
};
