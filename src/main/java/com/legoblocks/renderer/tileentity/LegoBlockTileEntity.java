package com.legoblocks.renderer.tileentity;

import com.legoblocks.renderer.block.LegoBlock;
import com.legoblocks.renderer.init.ModTileEntities;
import net.minecraft.core.BlockPos;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.protocol.Packet;
import net.minecraft.network.protocol.game.ClientGamePacketListener;
import net.minecraft.network.protocol.game.ClientboundBlockEntityDataPacket;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;

public class LegoBlockTileEntity extends BlockEntity {
    private LegoBlock.BrickType brickType;
    private int color = 0xFF0000; // Default red color
    private float rotationY = 0.0f;
    private boolean hasDetailedModel = true;

    public LegoBlockTileEntity(BlockPos pos, BlockState state) {
        super(ModTileEntities.LEGO_BLOCK_TILE_ENTITY.get(), pos, state);
        if (state.getBlock() instanceof LegoBlock legoBlock) {
            this.brickType = legoBlock.getBrickType();
        }
    }

    public LegoBlockTileEntity(BlockPos pos, BlockState state, LegoBlock.BrickType brickType) {
        super(ModTileEntities.LEGO_BLOCK_TILE_ENTITY.get(), pos, state);
        this.brickType = brickType;
    }

    @Override
    public void load(CompoundTag compound) {
        super.load(compound);
        this.color = compound.getInt("Color");
        this.rotationY = compound.getFloat("RotationY");
        this.hasDetailedModel = compound.getBoolean("DetailedModel");
        if (compound.contains("BrickType")) {
            this.brickType = LegoBlock.BrickType.valueOf(compound.getString("BrickType"));
        }
    }

    @Override
    protected void saveAdditional(CompoundTag compound) {
        super.saveAdditional(compound);
        compound.putInt("Color", this.color);
        compound.putFloat("RotationY", this.rotationY);
        compound.putBoolean("DetailedModel", this.hasDetailedModel);
        if (this.brickType != null) {
            compound.putString("BrickType", this.brickType.name());
        }
    }

    @Override
    public CompoundTag getUpdateTag() {
        CompoundTag compound = super.getUpdateTag();
        saveAdditional(compound);
        return compound;
    }

    @Override
    public Packet<ClientGamePacketListener> getUpdatePacket() {
        return ClientboundBlockEntityDataPacket.create(this);
    }

    // Getters and setters
    public LegoBlock.BrickType getBrickType() {
        return brickType;
    }

    public void setBrickType(LegoBlock.BrickType brickType) {
        this.brickType = brickType;
        setChanged();
    }

    public int getColor() {
        return color;
    }

    public void setColor(int color) {
        this.color = color;
        setChanged();
    }

    public float getRotationY() {
        return rotationY;
    }

    public void setRotationY(float rotationY) {
        this.rotationY = rotationY;
        setChanged();
    }

    public boolean hasDetailedModel() {
        return hasDetailedModel;
    }

    public void setDetailedModel(boolean hasDetailedModel) {
        this.hasDetailedModel = hasDetailedModel;
        setChanged();
    }
}
