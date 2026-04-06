/// <reference types="cypress" />

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

// Mochawesome emits files as cypress.json / cypress_001.json when overwrite=false.
// We match those raw files and rename them per executed spec in after:spec.
const RAW_REPORT_FILE_REGEX = /^cypress(?:_\d+)?\.json$/;

// Convert the spec filename to a stable, filesystem-safe suite identifier.
const toSuiteName = specRelativePath =>
    path
        .basename(specRelativePath)
        .replace(/\.cy\.[jt]sx?$/i, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');

const sanitizeRunId = runId => String(runId).replace(/[^a-zA-Z0-9_-]/g, '_');

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@jahia/cypress/dist/plugins/registerPlugins').registerPlugins(on, config);

    // Keep one run id for the whole Cypress execution so all specs from a run share it.
    const runId = sanitizeRunId(
        config.env?.runId || process.env.CYPRESS_RUN_ID || process.env.GITHUB_RUN_ID || Date.now().toString()
    );

    // We rename after each spec because [name] placeholders are not expanded
    // reliably in this reporter stack (cypress-multi-reporters + mochawesome).
    on('after:spec', spec => {
        const reportDir = path.resolve(config.projectRoot, 'results/reports');
        if (!fs.existsSync(reportDir)) {
            return;
        }

        const rawReports = fs
            .readdirSync(reportDir)
            .filter(fileName => RAW_REPORT_FILE_REGEX.test(fileName))
            .map(fileName => ({
                filePath: path.join(reportDir, fileName),
                mtimeMs: fs.statSync(path.join(reportDir, fileName)).mtimeMs
            }))
            .sort((a, b) => b.mtimeMs - a.mtimeMs);

        if (rawReports.length === 0) {
            return;
        }

        // Rename ALL matching raw reports (not just the most recent) to avoid
        // leaving orphans when two specs finish close together.
        const baseName = `cypress_${toSuiteName(spec.relative)}_${runId}`;
        for (const report of rawReports) {
            let targetName = `${baseName}.json`;
            let index = 1;

            while (fs.existsSync(path.join(reportDir, targetName))) {
                targetName = `${baseName}_${String(index).padStart(3, '0')}.json`;
                index += 1;
            }

            fs.renameSync(report.filePath, path.join(reportDir, targetName));
        }
    });

    on('task', {});
    return config;
};
