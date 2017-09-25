import { Injectable } from '@angular/core';

@Injectable()
export class Joystick {

    baseX = 200;
    baseY = 200;
    stickX = 200;
    stickY = 200;
    stickRadius = 25;
    container = document.body;
    strokeStyle = "#80CADC";
    baseEl;
    stickEl;

    pressed = false;
    touchIdx = null;
    visible = false;
    added = false;

    constructor() {
        this.baseEl = this.buildJoystickBase();
        this.stickEl = this.buildJoystickStick();
        this.baseEl.style.position = "absolute";
        this.baseEl.style.zIndex = "5";
        this.baseEl.style.display = "none";
        this.stickEl.style.position = "absolute";
        this.stickEl.style.zIndex = "5";
        this.stickEl.style.display = "none";

        this.hide();
    }

    updateLocation(screenWidth, screenHeight) {
        this.baseX = screenWidth - 100;
        this.baseY = screenHeight - 100;
        this.stickX = this.baseX;
        this.stickY = this.baseY;
        this.baseEl.style.left = (this.baseX - this.baseEl.width / 2) + "px";
        this.baseEl.style.top = (this.baseY - this.baseEl.height / 2) + "px";
    }

    update() {
        if (this.pressed) {
            this.moveCallback(this.deltaX(), this.deltaY());
        }
    }

    show() {
        this.baseEl.style.display = "";
        this.visible = true;
        if (!this.added) {
            this.added = true;
            var c = document.getElementById("container");
            c.appendChild(this.baseEl);
            c.appendChild(this.stickEl);
        }

        this.container.addEventListener('touchstart', this.onTouchStart, false);
        this.container.addEventListener('touchend', this.onTouchEnd, false);
        this.container.addEventListener('touchmove', this.onTouchMove, false);
        this.container.addEventListener('mousedown', this.onMouseDown, false);
        this.container.addEventListener('mouseup', this.onMouseUp, false);
        this.container.addEventListener('mousemove', this.onMouseMove, false);
    }

    hide() {
        this.baseEl.style.display = "none";
        this.visible = false;

        this.container.removeEventListener('touchstart', this.onTouchStart, false);
        this.container.removeEventListener('touchend', this.onTouchEnd, false);
        this.container.removeEventListener('touchmove', this.onTouchMove, false);
        this.container.removeEventListener('mousedown', this.onMouseDown, false);
        this.container.removeEventListener('mouseup', this.onMouseUp, false);
        this.container.removeEventListener('mousemove', this.onMouseMove, false);
    }

    deltaX() { return this.stickX - this.baseX; }
    deltaY() { return this.stickY - this.baseY; }

    up() {
        if (this.pressed === false) return false;
        var deltaX = this.deltaX();
        var deltaY = this.deltaY();
        if (deltaY >= 0) return false;
        if (Math.abs(deltaX) > 2 * Math.abs(deltaY)) return false;
        return true;
    }

    down() {
        if (this.pressed === false) return false;
        var deltaX = this.deltaX();
        var deltaY = this.deltaY();
        if (deltaY <= 0) return false;
        if (Math.abs(deltaX) > 2 * Math.abs(deltaY)) return false;
        return true;
    }

    right() {
        if (this.pressed === false) return false;
        var deltaX = this.deltaX();
        var deltaY = this.deltaY();
        if (deltaX <= 0) return false;
        if (Math.abs(deltaY) > 2 * Math.abs(deltaX)) return false;
        return true;
    }

    left() {
        if (this.pressed === false) return false;
        var deltaX = this.deltaX();
        var deltaY = this.deltaY();
        if (deltaX >= 0) return false;
        if (Math.abs(deltaY) > 2 * Math.abs(deltaX)) return false;
        return true;
    }

    onUp() {
        this.pressed = false;
        this.stickEl.style.display = "none";
    }

    onDown(x, y):any {
        var leftX = this.baseX - this.baseEl.width / 2;
        var topY = this.baseY - this.baseEl.height / 2;
        if (this.visible && x > leftX && x < leftX + this.baseEl.width &&
            y > topY && y < topY + this.baseEl.height) {
            this.pressed = true;

            this.stickX = x;
            this.stickY = y;

            var deltaX = this.deltaX();
            var deltaY = this.deltaY();
            var stickDistance = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
            if (stickDistance > this.stickRadius) {
                var stickNormalizedX = deltaX / stickDistance;
                var stickNormalizedY = deltaY / stickDistance;

                this.stickX = stickNormalizedX * this.stickRadius + this.baseX;
                this.stickY = stickNormalizedY * this.stickRadius + this.baseY;
            }

            this.stickEl.style.display = "";
            this.move(this.stickEl.style, (this.stickX - this.stickEl.width / 2), (this.stickY - this.stickEl.height / 2));
            return true;
        }
        return false;
    }

    moveCallback = function (deltaX, deltaY) {

    }

    onMove(x, y) {
        if (this.pressed === true) {
            this.stickX = x;
            this.stickY = y;

            var deltaX = this.deltaX();
            var deltaY = this.deltaY();
            var stickDistance = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
            if (stickDistance > this.stickRadius) {
                var stickNormalizedX = deltaX / stickDistance;
                var stickNormalizedY = deltaY / stickDistance;

                this.stickX = stickNormalizedX * this.stickRadius + this.baseX;
                this.stickY = stickNormalizedY * this.stickRadius + this.baseY;
            }

            this.move(this.stickEl.style, (this.stickX - this.stickEl.width / 2), (this.stickY - this.stickEl.height / 2));
        }
    }

    onMouseUp = (event) => {
        return this.onUp();
    }

    onMouseDown = (event) => {
        event.preventDefault();
        var x = event.clientX;
        var y = event.clientY;
        return this.onDown(x, y);
    }

    onMouseMove = (event) => {
        var x = event.clientX;
        var y = event.clientY;
        return this.onMove(x, y);
    }

    onTouchStart = (event) => {

        // get the first who changed
        var touch = event.changedTouches[0];
        // set the touchIdx of this joystick
        this.touchIdx = touch.identifier;

        // forward the action
        var x = touch.pageX;
        var y = touch.pageY;
        var d = this.onDown(x, y);
        //if (d) {
            event.preventDefault();
        //}
    }

    onTouchEnd = (event) => {
        // if there is no touch in progress, do nothing
        if (this.touchIdx === null || !this.pressed) return;

        // try to find our touch event
        var touchList = event.changedTouches;
        for (var i = 0; i < touchList.length && touchList[i].identifier !== this.touchIdx; i++);

        // reset touchIdx - mark it as no-touch-in-progress
        this.touchIdx = null;

        // if touch event isnt found, 
        if (i === touchList.length) return;

        //??????
        // no preventDefault to get click event on ios
        event.preventDefault();

        return this.onUp()
    }

    onTouchMove = (event) => {
        // if there is no touch in progress, do nothing
        if (this.touchIdx === null || !this.pressed) return;

        // try to find our touch event
        var touchList = event.changedTouches;
        for (var i = 0; i < touchList.length && touchList[i].identifier !== this.touchIdx; i++);
        // if touch event with the proper identifier isnt found, do nothing
        if (i === touchList.length) return;
        var touch = touchList[i];

        event.preventDefault();

        var x = touch.pageX;
        var y = touch.pageY;
        return this.onMove(x, y)
    }

    buildJoystickBase() {
        var canvas = document.createElement('canvas');
        canvas.width = 126;
        canvas.height = 126;

        var ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = 6;
        ctx.arc(canvas.width / 2, canvas.width / 2, 40, 0, Math.PI * 2, true);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = 2;
        ctx.arc(canvas.width / 2, canvas.width / 2, 60, 0, Math.PI * 2, true);
        ctx.stroke();

        return canvas;
    }

    buildJoystickStick() {
        var canvas = document.createElement('canvas');
        canvas.width = 86;
        canvas.height = 86;
        var ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = 6;
        ctx.arc(canvas.width / 2, canvas.width / 2, 40, 0, Math.PI * 2, true);
        ctx.stroke();
        return canvas;
    }

    move(style, x, y) {
        style.left = x + 'px';
        style.top = y + 'px';
    }

    destroy() {
        this.container.removeChild(this.baseEl);
        this.container.removeChild(this.stickEl);

        this.container.removeEventListener('touchstart', this.onTouchStart, false);
        this.container.removeEventListener('touchend', this.onTouchEnd, false);
        this.container.removeEventListener('touchmove', this.onTouchMove, false);
        this.container.removeEventListener('mouseup', this.onMouseUp, false);
        this.container.removeEventListener('mousedown', this.onMouseDown, false);
        this.container.removeEventListener('mousemove', this.onMouseMove, false);
    }

    touchScreenAvailable() {
        return 'createTouch' in document ? true : false;
    }
}