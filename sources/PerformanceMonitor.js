class PerformanceMonitor {
	constructor() {
		this.measurements = new Map();
		this.currentStep = null;
		this.enabled = true;
	}

	/**
	 * Начать измерение шага (автоматически завершает предыдущий)
	 */
	start(stepName) {
		if (!this.enabled) return this;

		// Завершаем текущий шаг, если он есть
		if (this.currentStep) {
			this.stop();
		}

		this.currentStep = {
			name: stepName,
			startTime: performance.now?.() || Date.now()
		};

		return this;
	}

	/**
	 * Завершить текущий шаг
	 */
	stop() {
		if (!this.enabled || !this.currentStep) return null;

		const step = this.currentStep;
		const endTime = performance.now?.() || Date.now();
		const durationMs = endTime - step.startTime;

		const measurement = {
			durationMs,
			startTime: step.startTime,
			endTime,
			calls: 1
		};

		if (this.measurements.has(step.name)) {
			const existing = this.measurements.get(step.name);
			existing.durationMs += durationMs;
			existing.calls++;
			existing.lastDurationMs = durationMs;
		} else {
			this.measurements.set(step.name, {
				...measurement,
				lastDurationMs: durationMs
			});
		}

		this.currentStep = null;
		return this.measurements.get(step.name);
	}

	/**
	 * Измерить асинхронную функцию
	 */
	async measureAsync(stepName, asyncFn) {
		if (!this.enabled) return asyncFn();

		this.start(stepName);
		try {
			return await asyncFn();
		} finally {
			this.stop();
		}
	}

	/**
	 * Измерить синхронную функцию
	 */
	measureSync(stepName, syncFn) {
		if (!this.enabled) return syncFn();

		this.start(stepName);
		try {
			return syncFn();
		} finally {
			this.stop();
		}
	}

	/**
	 * Получить статистику
	 */
	getStats() {
		const stats = { totalDurationMs: 0, totalCalls: 0, steps: {} };

		for (const [stepName, data] of this.measurements.entries()) {
			stats.steps[stepName] = {
				totalDurationMs: data.durationMs,
				averageDurationMs: data.durationMs / data.calls,
				calls: data.calls,
				lastDurationMs: data.lastDurationMs
			};

			stats.totalDurationMs += data.durationMs;
			stats.totalCalls += data.calls;
		}

		return stats;
	}

	/**
	 * Простой отчет
	 */
	getReport() {
		const stats = this.getStats();
		let report = '📊 Performance Report\n';
		report += '='.repeat(40) + '\n\n';

		for (const [stepName, stepStats] of Object.entries(stats.steps)) {
			report += `🔹 ${stepName}: ${stepStats.totalDurationMs.toFixed(2)}ms `;
			report += `(${stepStats.calls} calls, avg: ${stepStats.averageDurationMs.toFixed(2)}ms)\n`;
		}

		report += `\nTotal: ${stats.totalDurationMs.toFixed(2)}ms, ${stats.totalCalls} calls\n`;
		return report;
	}

	/**
	 * Сбросить измерения
	 */
	reset() {
		this.measurements.clear();
		this.currentStep = null;
	}
}
export default PerformanceMonitor