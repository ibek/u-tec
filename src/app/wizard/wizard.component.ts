import { Component, OnInit } from '@angular/core';
import { ObservableMedia } from '@angular/flex-layout';
import { Observable } from "rxjs/Observable";

@Component({
    selector: 'wizard',
    templateUrl: './wizard.component.html',
    styleUrls: ['./wizard.component.css']
})
export class WizardComponent implements OnInit {
    ships = [{ "name": "F7C Hornet" }, { "name": "F7C Hornet" }, { "name": "F7C Hornet" }, { "name": "F7C Hornet" }, { "name": "F7C Hornet" }, { "name": "F7C Hornet" }, { "name": "F7C Hornet" }];
    public cols: Observable<number>;

    constructor(private observableMedia: ObservableMedia) {

    }

    ngOnInit() {
        // set cols
        if (this.observableMedia.isActive("xs")) {
            this.cols = Observable.of(2);
        } else if (this.observableMedia.isActive("sm")) {
            this.cols = Observable.of(3);
        } else if (this.observableMedia.isActive("md")) {
            this.cols = Observable.of(5);
        } else if (this.observableMedia.isActive("lg")) {
            this.cols = Observable.of(6);
        } else if (this.observableMedia.isActive("x1")) {
            this.cols = Observable.of(7);
        }

        // observe changes
        this.observableMedia.asObservable()
            .subscribe(change => {
                switch (change.mqAlias) {
                    case "xs":
                        return this.cols = Observable.of(2);
                    case "sm":
                        return this.cols = Observable.of(3);
                    case "md":
                        return this.cols = Observable.of(5);
                    case "lg":
                        return this.cols = Observable.of(6);
                    case "xl":
                        return this.cols = Observable.of(7);
                }
            });
    }
}
