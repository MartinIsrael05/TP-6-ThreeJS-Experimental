// Puntero virtual: convierte la mano en eventos de puntero, como si fuera un
// mouse. Así las escenas, el dibujo de hechizos y los botones funcionan con
// la mano sin saber que existe.
//
// Mover la mano dispara pointermove sobre lo que haya debajo; pellizcar es
// apretar (pointerdown) y soltar el pellizco es soltar (pointerup) y, si
// seguís sobre lo mismo, click. Mientras está apretado, los eventos siguen
// yendo a donde empezó el pellizco, como hace el navegador al arrastrar.

const POINTER_ID = 9001;

function fire(type, target, x, y, buttons) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: x,
      clientY: y,
      pointerId: POINTER_ID,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
      buttons,
    }),
  );
}

// Los controles HTML se activan con click() (así responden también
// <summary> y los <input>); el canvas necesita las coordenadas del click.
function click(target, x, y) {
  const control = target.closest?.("button, a, summary, label, input, select");
  if (control) control.click();
  else target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
}

export function createVirtualPointer() {
  let pressed = false;
  let downTarget = null;
  let last = { x: 0, y: 0 };

  function release() {
    pressed = false;
    if (!downTarget?.isConnected) {
      downTarget = null;
      return;
    }
    fire("pointerup", downTarget, last.x, last.y, 0);
    const over = document.elementFromPoint(last.x, last.y);
    if (over && (over === downTarget || downTarget.contains(over) || over.contains(downTarget))) click(over, last.x, last.y);
    downTarget = null;
  }

  return {
    // frame: { x, y, pinched } de 0 a 1 en la pantalla, o null sin mano.
    update(frame) {
      if (!frame) {
        if (pressed) release();
        return;
      }
      last = { x: frame.x * window.innerWidth, y: frame.y * window.innerHeight };
      const target = pressed && downTarget?.isConnected ? downTarget : document.elementFromPoint(last.x, last.y);
      if (!target) return;
      fire("pointermove", target, last.x, last.y, pressed ? 1 : 0);
      if (frame.pinched && !pressed) {
        pressed = true;
        downTarget = target;
        fire("pointerdown", target, last.x, last.y, 1);
      } else if (!frame.pinched && pressed) {
        release();
      }
    },
    position: () => last,
    reset() {
      if (pressed) release();
    },
  };
}
