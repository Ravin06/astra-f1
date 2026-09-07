export class Input {
  constructor(settings, onAction) {
    this.settings = settings;
    this.onAction = onAction;
    this.keys = new Set();
    this.touch = {};
    this.lastPad = {};
    this.capture = null;
    window.addEventListener("keydown", (e) => {
      if (this.capture) {
        e.preventDefault();
        const done = this.capture;
        this.capture = null;
        done(e.code);
        return;
      }
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      )
        e.preventDefault();
      this.keys.add(e.code);
      if (e.repeat) return;
      for (const action of ["item", "reset", "camera"])
        if (e.code === this.settings.bindings[action]) onAction(action);
      if (e.code === "Escape") onAction("pause");
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => {
      this.clear();
      onAction("blur");
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.clear();
        onAction("blur");
      }
    });
  }
  clear() {
    this.keys.clear();
    this.touch = {};
  }
  read() {
    const b = this.settings.bindings,
      held = (k, alt) =>
        this.keys.has(b[k]) || this.keys.has(alt) || this.touch[k];
    // The kart model faces +Z; positive world yaw is left in its chase camera.
    let steer =
      Number(!!held("left", "ArrowLeft")) -
      Number(!!held("right", "ArrowRight"));
    let throttle = Number(!!held("throttle", "ArrowUp")),
      brake = Number(!!held("brake", "ArrowDown")),
      drift = !!held("drift"),
      boost = !!held("boost");
    const pad = Array.from(navigator.getGamepads?.() || []).find(Boolean);
    if (pad) {
      let axis = pad.axes[0] || 0;
      const dead = this.settings.deadzone;
      axis =
        Math.abs(axis) < dead
          ? 0
          : (Math.sign(axis) * (Math.abs(axis) - dead)) / (1 - dead);
      steer = -axis || steer;
      throttle = Math.max(throttle, pad.buttons[7]?.value || 0);
      brake = Math.max(brake, pad.buttons[6]?.value || 0);
      drift ||= !!pad.buttons[0]?.pressed;
      boost ||= !!pad.buttons[1]?.pressed;
      for (const [i, action] of [
        [2, "item"],
        [3, "camera"],
        [9, "pause"],
      ]) {
        if (pad.buttons[i]?.pressed && !this.lastPad[i]) this.onAction(action);
        this.lastPad[i] = pad.buttons[i]?.pressed;
      }
    }
    return {
      steer: Math.max(-1, Math.min(1, steer * this.settings.sensitivity)),
      throttle,
      brake,
      drift,
      boost,
    };
  }
}
