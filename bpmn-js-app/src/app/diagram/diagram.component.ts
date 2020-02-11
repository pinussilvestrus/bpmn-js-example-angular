import {
  AfterContentInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
  SimpleChanges,
  EventEmitter
} from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { map, catchError, retry } from 'rxjs/operators';

/**
 * You may include a different variant of BpmnJS:
 *
 * bpmn-viewer  - displays BPMN diagrams without the ability
 *                to navigate them
 * bpmn-modeler - bootstraps a full-fledged BPMN editor
 */
import * as BpmnJS from 'bpmn-js/dist/bpmn-modeler.production.min.js';

import * as PropertiesPanelModule from 'bpmn-js-properties-panel';

import * as camundaModdleDescriptor from 'camunda-bpmn-moddle';

import * as PropertiesProviderModule from 'bpmn-js-properties-panel/lib/provider/camunda';

import { importDiagram } from './rx';

import { throwError } from 'rxjs';

@Component({
  selector: 'app-diagram',
  template: `
    <div>
      <div #diagram class="diagram-container"></div>
      <div #panel class="properties-panel-parent" id="js-properties-panel"></div>
    </div>
  `,
  styles: [
    `
      .diagram-container {
        height: 500px;
        width: 100%;
      }

      .properties-panel-parent {
        position: absolute;
        top: 0;
        bottom: 0;
        right: 0;
        width: 200px;
        z-index: 10;
        border-left: 1px solid #ccc;
        overflow: auto;
      }

      .properties-panel-parent .djs-properties-panel {
        padding-bottom: 70px;
        min-height:100%;
      }
    `
  ]
})
export class DiagramComponent implements AfterContentInit, OnChanges, OnDestroy {
  private bpmnJS: BpmnJS;

  @ViewChild('diagram') private diagramEl: ElementRef;
  @ViewChild('panel') private panelEl: ElementRef;

  @Output() private importDone: EventEmitter<any> = new EventEmitter();

  @Input() private url: string;

  constructor(private http: HttpClient) {

    this.bpmnJS = new BpmnJS({
      additionalModules: [
        PropertiesPanelModule,
        PropertiesProviderModule
      ],
      // needed if you'd like to maintain camunda:XXX properties in the properties panel
      moddleExtensions: {
        camunda: camundaModdleDescriptor
      }
    });

    this.bpmnJS.on('import.done', ({ error }) => {
      if (!error) {
        this.bpmnJS.get('canvas').zoom('fit-viewport');
      }
    });
  }

  ngAfterContentInit(): void {
    this.bpmnJS.attachTo(this.diagramEl.nativeElement);

    this.bpmnJS.get('propertiesPanel').attachTo(this.panelEl.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges) {
    // re-import whenever the url changes
    if (changes.url) {
      this.loadUrl(changes.url.currentValue);
    }
  }

  ngOnDestroy(): void {
    this.bpmnJS.destroy();
  }

  /**
   * Load diagram from URL and emit completion event
   */
  loadUrl(url: string) {

    return (
      this.http.get(url, { responseType: 'text' }).pipe(
        catchError(err => throwError(err)),
        importDiagram(this.bpmnJS)
      ).subscribe(
        (warnings) => {
          this.importDone.emit({
            type: 'success',
            warnings
          });
        },
        (err) => {
          this.importDone.emit({
            type: 'error',
            error: err
          });
        }
      )
    );
  }

}
