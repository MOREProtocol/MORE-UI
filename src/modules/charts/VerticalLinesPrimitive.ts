import type {
  IPanePrimitive,
  IPanePrimitivePaneView,
  IPrimitivePaneRenderer,
  PaneAttachedParameter,
  Time,
} from 'lightweight-charts';

/**
 * Draws one or more vertical dashed lines at given times in the main chart pane.
 * Uses the Lightweight Charts v5 primitives API (pane primitive).
 */
export class VerticalLinesPrimitive implements IPanePrimitive<Time> {
  private _attached?: PaneAttachedParameter<Time>;
  private _times: Time[];
  private _color: string;
  private _lineWidth: number;
  private _dash: number[];

  private readonly _paneView: IPanePrimitivePaneView;

  constructor(opts: { times: Time[]; color: string; lineWidth?: number; dash?: number[] }) {
    this._times = opts.times;
    this._color = opts.color;
    this._lineWidth = opts.lineWidth ?? 1;
    this._dash = opts.dash ?? [6, 6];

    this._paneView = new VerticalLinesPaneView(this);
  }

  attached(param: PaneAttachedParameter<Time>): void {
    this._attached = param;
  }

  detached(): void {
    this._attached = undefined;
  }

  updateTimes(times: Time[]): void {
    this._times = times;
    this._attached?.requestUpdate();
  }

  updateStyle(opts: { color?: string; lineWidth?: number; dash?: number[] }): void {
    if (opts.color !== undefined) this._color = opts.color;
    if (opts.lineWidth !== undefined) this._lineWidth = opts.lineWidth;
    if (opts.dash !== undefined) this._dash = opts.dash;
    this._attached?.requestUpdate();
  }

  paneViews(): readonly IPanePrimitivePaneView[] {
    return [this._paneView];
  }

  /** @internal */
  _getAttached(): PaneAttachedParameter<Time> | undefined {
    return this._attached;
  }

  /** @internal */
  _getTimes(): Time[] {
    return this._times;
  }

  /** @internal */
  _getStyle(): { color: string; lineWidth: number; dash: number[] } {
    return { color: this._color, lineWidth: this._lineWidth, dash: this._dash };
  }
}

class VerticalLinesPaneView implements IPanePrimitivePaneView {
  private readonly _renderer: IPrimitivePaneRenderer;

  constructor(source: VerticalLinesPrimitive) {
    this._renderer = new VerticalLinesRenderer(source);
  }

  renderer(): IPrimitivePaneRenderer | null {
    return this._renderer;
  }
}

class VerticalLinesRenderer implements IPrimitivePaneRenderer {
  private readonly _source: VerticalLinesPrimitive;

  constructor(source: VerticalLinesPrimitive) {
    this._source = source;
  }

  draw(target: import('fancy-canvas').CanvasRenderingTarget2D): void {
    const attached = this._source._getAttached();
    if (!attached) return;

    const { chart } = attached;
    const timeScale = chart.timeScale();
    const times = this._source._getTimes();
    const { color, lineWidth, dash } = this._source._getStyle();

    if (!times || times.length === 0) return;

    target.useBitmapCoordinateSpace(({ context, bitmapSize, horizontalPixelRatio, verticalPixelRatio }) => {
      context.save();
      context.strokeStyle = color;
      context.lineWidth = Math.max(1, lineWidth * verticalPixelRatio);
      context.setLineDash(dash.map((d) => d * horizontalPixelRatio));

      for (const t of times) {
        const x = timeScale.timeToCoordinate(t);
        if (x === null) continue;

        // Convert media coords -> bitmap coords and align for crisp stroke.
        const bx = Math.round(x * horizontalPixelRatio) + 0.5;
        context.beginPath();
        context.moveTo(bx, 0);
        context.lineTo(bx, bitmapSize.height);
        context.stroke();
      }

      context.restore();
    });
  }
}

