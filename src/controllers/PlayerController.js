export class PlayerController {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.keys = scene.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      jump: Phaser.Input.Keyboard.KeyCodes.W,
      jumpAlt: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
    this.moveSpeed = 230;
    this.jumpSpeed = 500;
    this.wasPointerDown = false;
    this.wasRightPointerDown = false;
  }

  setPlayer(player) {
    this.player = player;
  }

  update() {
    const body = this.player.body;
    if (!body) return;
    const pointer = this.scene.input.activePointer;

    const pointerDown = pointer.leftButtonDown();
    if (pointerDown && !this.wasPointerDown) {
      this.scene.tryPlayerAttack();
    }
    this.wasPointerDown = pointerDown;

    const rightDown = pointer.rightButtonDown();
    if (rightDown && !this.wasRightPointerDown) {
      this.scene.tryPlayerSpecial();
    }
    this.wasRightPointerDown = rightDown;

    if (this.scene.isControlledPlayerLocked()) {
      this.player.setVelocityX(0);
      this.scene.updatePlayerMotionState(false, this.player);
      return;
    }

    let isMoving = false;

    if (this.keys.left.isDown) {
      this.player.setVelocityX(-this.moveSpeed);
      this.scene.setPlayerFacing(this.player, true);
      isMoving = true;
    } else if (this.keys.right.isDown) {
      this.player.setVelocityX(this.moveSpeed);
      this.scene.setPlayerFacing(this.player, false);
      isMoving = true;
    } else {
      this.player.setVelocityX(0);
    }

    const wantsJump =
      Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jumpAlt);

    if (wantsJump && body.blocked.down) {
      this.player.setVelocityY(-this.jumpSpeed);
    }

    this.scene.updatePlayerMotionState(isMoving && body.blocked.down, this.player);
  }
}
