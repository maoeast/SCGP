const MODULE_META = {
    sensory: { title: '感官训练', subtitle: 'sensory' },
    emotional: { title: '情绪发展', subtitle: 'emotional' },
    social: { title: '社交发展', subtitle: 'social' },
    cognitive: { title: '认知发展', subtitle: 'cognitive' },
    life_skills: { title: '生活技能', subtitle: 'life_skills' }
};

const state = {
    outputDir: '',
    latestOutputPath: ''
};

const form = document.getElementById('license-form');
const resultPanel = document.getElementById('result-panel');
const moduleGrid = document.getElementById('module-grid');
const machineField = document.getElementById('machine-field');
const daysField = document.getElementById('days-field');
const machineInput = document.getElementById('machine-id');
const daysInput = document.getElementById('days');
const pasteMachineButton = document.getElementById('paste-machine-button');
const statusChip = document.getElementById('status-chip');
const statusDetail = document.getElementById('status-detail');
const licenseOutput = document.getElementById('license-output');
const copyLicenseButton = document.getElementById('copy-license-button');
const selectAllModulesButton = document.getElementById('select-all-modules');
const resetButton = document.getElementById('reset-button');

function getSelectedType() {
    return document.querySelector('input[name="licenseType"]:checked')?.value || 'trial';
}

function getSelectedModules() {
    return [...document.querySelectorAll('input[name="allowedModules"]:checked')].map((element) => element.value);
}

function renderModules(modules) {
    moduleGrid.innerHTML = modules.map((moduleCode) => {
        const meta = MODULE_META[moduleCode] || { title: moduleCode, subtitle: moduleCode };
        return `
            <label class="module-card">
              <input type="checkbox" name="allowedModules" value="${moduleCode}" checked>
              <span class="module-title">${meta.title}</span>
              <span class="module-subtitle">${meta.subtitle}</span>
            </label>
        `;
    }).join('');
}

function syncModeSelectionStyles() {
    document.querySelectorAll('.mode-card').forEach((card) => {
        const input = card.querySelector('input[name="licenseType"]');
        card.classList.toggle('is-selected', Boolean(input?.checked));
    });
}

function syncModuleSelectionStyles() {
    document.querySelectorAll('.module-card').forEach((card) => {
        const input = card.querySelector('input[name="allowedModules"]');
        card.classList.toggle('is-selected', Boolean(input?.checked));
    });
}

function syncModuleToggleButton() {
    const selectedCount = getSelectedModules().length;
    const totalCount = document.querySelectorAll('input[name="allowedModules"]').length;
    selectAllModulesButton.textContent = selectedCount === totalCount ? '取消' : '全选';
}

function updateVisibility() {
    const type = getSelectedType();
    const requiresMachineId = type !== 'trial';
    const requiresDays = type === 'full';

    machineField.classList.toggle('is-disabled', !requiresMachineId);
    daysField.classList.toggle('is-hidden', !requiresDays);
    machineInput.disabled = !requiresMachineId;
    pasteMachineButton.disabled = !requiresMachineId;
    daysInput.disabled = !requiresDays;
    machineInput.required = requiresMachineId;
    daysInput.required = requiresDays;

    if (!requiresMachineId) {
        machineInput.value = '';
    }

    syncModeSelectionStyles();
}

function setStatus(stateName, message) {
    const chipTextMap = {
        idle: '等待生成',
        loading: '生成中',
        success: '已生成',
        error: '生成失败'
    };

    statusChip.dataset.state = stateName;
    statusChip.textContent = chipTextMap[stateName] || chipTextMap.idle;
    statusDetail.textContent = message;
}

function resetSummary() {
    document.getElementById('summary-type').textContent = '—';
    document.getElementById('summary-machine').textContent = '—';
    document.getElementById('summary-validity').textContent = '—';
    document.getElementById('summary-created').textContent = '—';
    document.getElementById('summary-expire').textContent = '—';
    document.getElementById('summary-modules').textContent = '—';
}

function renderSummary(summary) {
    document.getElementById('summary-type').textContent = summary.typeLabel;
    document.getElementById('summary-machine').textContent = summary.machineIdLabel;
    document.getElementById('summary-validity').textContent = summary.validityLabel;
    document.getElementById('summary-created').textContent = summary.createdAtLabel;
    document.getElementById('summary-expire').textContent = summary.expireAtLabel || '永久或不适用';
    document.getElementById('summary-modules').innerHTML = summary.allowedModules.map((moduleCode) => {
        const meta = MODULE_META[moduleCode] || { title: moduleCode };
        return `<span class="summary-module-tag">${meta.title}<small>${moduleCode}</small></span>`;
    }).join('');
}

function renderArtifact(artifact) {
    state.latestOutputPath = artifact.outputPath;
    resultPanel.classList.remove('is-empty');
    licenseOutput.value = artifact.formattedKey;
    renderSummary(artifact.summary);
    copyLicenseButton.disabled = false;
}

function validateForm() {
    const type = getSelectedType();
    const machineId = machineInput.value.trim();
    const selectedModules = getSelectedModules();

    if (selectedModules.length === 0) {
        throw new Error('至少选择一个授权模块');
    }

    if (type !== 'trial' && !machineId) {
        throw new Error('正式码和永久码必须填写机器码');
    }

    if (type === 'full') {
        const days = Number.parseInt(daysInput.value, 10);
        if (!Number.isInteger(days) || days <= 0) {
            throw new Error('正式码的授权天数必须是正整数');
        }
    }
}

async function handleGenerate(event) {
    event.preventDefault();

    try {
        validateForm();
        setStatus('loading', '正在生成激活码...');

        const response = await window.licenseGeneratorApi.generateLicense({
            type: getSelectedType(),
            machineId: machineInput.value.trim(),
            days: daysInput.value,
            allowedModules: getSelectedModules()
        });

        if (!response?.ok) {
            throw new Error(response?.error || '生成失败');
        }

        renderArtifact(response.artifact);
        setStatus('success', `激活码已生成，结果文件已保存到 ${response.artifact.outputPath}`);
    } catch (error) {
        setStatus('error', error instanceof Error ? error.message : '生成激活码失败');
    }
}

async function handleCopyLicense() {
    if (!licenseOutput.value) {
        return;
    }

    await window.licenseGeneratorApi.copyText(licenseOutput.value);
    setStatus('success', '激活码已复制到剪贴板');
}

async function readClipboardText() {
    if (navigator.clipboard?.readText) {
        return navigator.clipboard.readText();
    }

    if (window.licenseGeneratorApi.readClipboardText) {
        return window.licenseGeneratorApi.readClipboardText();
    }

    throw new Error('当前环境不支持读取剪贴板');
}

async function handlePasteMachineCode() {
    try {
        if (pasteMachineButton.disabled) {
            return;
        }

        const clipboardText = (await readClipboardText()).trim();
        if (!clipboardText) {
            throw new Error('剪贴板为空，无法粘贴机器码');
        }

        machineInput.value = clipboardText;
        setStatus('idle', '已从剪贴板粘贴机器码');
    } catch (error) {
        setStatus('error', error instanceof Error ? error.message : '读取剪贴板失败');
    }
}

function handleReset() {
    form.reset();
    updateVisibility();
    licenseOutput.value = '';
    state.latestOutputPath = '';
    copyLicenseButton.disabled = true;
    resultPanel.classList.add('is-empty');
    resetSummary();
    setStatus('idle', '生成后会在这里显示结果摘要。');

    document.querySelectorAll('input[name="allowedModules"]').forEach((input) => {
        input.checked = true;
    });

    syncModuleSelectionStyles();
    syncModuleToggleButton();
}

function handleSelectAllModules() {
    const moduleInputs = document.querySelectorAll('input[name="allowedModules"]');
    const shouldSelectAll = getSelectedModules().length !== moduleInputs.length;

    moduleInputs.forEach((input) => {
        input.checked = shouldSelectAll;
    });

    syncModuleSelectionStyles();
    syncModuleToggleButton();
}

async function bootstrap() {
    const config = await window.licenseGeneratorApi.getConfig();
    state.outputDir = config.outputDir;

    renderModules(config.modules);
    resetSummary();
    updateVisibility();
    syncModuleSelectionStyles();
    syncModuleToggleButton();

    form.addEventListener('submit', handleGenerate);
    document.querySelectorAll('input[name="licenseType"]').forEach((radio) => {
        radio.addEventListener('change', updateVisibility);
    });
    moduleGrid.addEventListener('change', () => {
        syncModuleSelectionStyles();
        syncModuleToggleButton();
    });
    copyLicenseButton.addEventListener('click', handleCopyLicense);
    pasteMachineButton.addEventListener('click', handlePasteMachineCode);
    selectAllModulesButton.addEventListener('click', handleSelectAllModules);
    resetButton.addEventListener('click', handleReset);
}

bootstrap().catch((error) => {
    setStatus('error', error instanceof Error ? error.message : '界面初始化失败');
});
